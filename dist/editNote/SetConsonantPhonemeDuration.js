"use strict";
/**
 * Synthesizer V Studio で利用可能な
 * 「子音の長さ設定」のスクリプトです。
 *
 * 選択中のノートに含まれる先頭の子音の長さを20～180の範囲で設定します。
 * 母音しか含まれないノートは設定対象から除外されます。
 * もし複数のノートを選択中の場合はそのすべてが対象になります。
 *
 * Copyright (c) 2020 スズモフ
 * Released under the MIT license
 * https://opensource.org/licenses/mit-license.php
 *
 * @author スズモフ
 * @version 1.0.0
 * @see {@link https://github.com/suzumof/synthv-suzu-scripts}
 */
/**
 * スクリプトの情報を返します。
 */
function getClientInfo() {
    return {
        name: SV.T(ScriptMessages.scriptTitle),
        category: SV.T(ScriptMessages.menuName),
        author: 'スズモフ',
        versionNumber: 1,
        minEditorVersion: 0x10003,
    };
}
var ScriptMessages = {
    menuName: 'edit note',
    scriptTitle: 'Set consonant phoneme duration',
    PhonemeDurationCaption: 'Phoneme duration (-160/+160)',
    PhonemeDurationDescription: 'Sets the consonant length in the range -160 to +160 for the currently selected note. ' +
        'The higher the number, the longer the consonant. ' +
        'If it exceeds the range of -80 to +80, adjust it using the vowel of the previous note.',
    SelectedNotesDoesNotExist: 'Selected notes does not exit',
    SelectedConsonantNotesDoesNotExist: 'The note to be operated does not contain consonants',
};
/**
 * 文章の翻訳テーブルを返します。
 */
function getTranslations(langCode) {
    switch (langCode) {
        case 'ja-jp':
            return [
                [ScriptMessages.menuName, 'ノート編集'],
                [ScriptMessages.scriptTitle, '子音の長さ設定'],
                [
                    ScriptMessages.PhonemeDurationCaption,
                    '子音の長さ (-160 ～ +160)',
                ],
                [
                    ScriptMessages.PhonemeDurationDescription,
                    '現在選択中のノートに対して子音の長さを±160の範囲で設定します。 ' +
                        '数値が大きいほど子音も長くなります。 ' +
                        '±80の範囲を超える場合は直前のノートの母音を使って調節します。',
                ],
                [
                    ScriptMessages.SelectedNotesDoesNotExist,
                    '操作対象のノートが選択されていません。',
                ],
                [
                    ScriptMessages.SelectedConsonantNotesDoesNotExist,
                    '操作対象のノートに子音が含まれていません。',
                ],
            ];
    }
    return [];
}
/**
 * ノートとグループ参照のペアオブジェクトです。
 * グループ化されているノートはプロジェクト上の複数の場所に出現する可能性があります。
 * その為、精確なタイムライン上の位置を知るにはグループ参照の情報が必要です。
 */
var NoteAndOnsetPair = /** @class */ (function () {
    /**
     * @param note ノート。
     * @param ref ノートが登録されているグループ参照。
     */
    function NoteAndOnsetPair(note, ref) {
        this.note = note;
        this.ref = ref;
        /**
         * ブリック単位の再生位置。
         */
        this.onset = 0;
        this.updateOnset();
    }
    /**
     * 再生位置を更新します。
     */
    NoteAndOnsetPair.prototype.updateOnset = function () {
        this.onset = this.note.getOnset() + this.ref.getOnset();
    };
    return NoteAndOnsetPair;
}());
/**
 * 再生位置の範囲オブジェクトです。
 */
var NumberRange = /** @class */ (function () {
    /**
     * @param start 開始位置。
     * @param end 終了位置。
     */
    function NumberRange(start, end) {
        this.start = start;
        this.end = end;
    }
    return NumberRange;
}());
/**
 * 全てのグループ内の選択中のノートと再生位置のリストを返します。
 *
 * 単純に選択中のノートを調べただけではグループ化されているノートが対象外になってしまうので、
 * 選択中のノートまで調べるようにしています。
 * @param editor 現在のエディタ。省略時はエディタオブジェクトを新たに取得します。
 */
function getSelectedNotePairListFromAllGroups(editor) {
    if (editor === void 0) { editor = SV.getMainEditor(); }
    var selectedPairList = [];
    var selectionState = editor.getSelection();
    if (selectionState.hasSelectedContent()) {
        // 現在のグループの開始位置を取得
        var parentGroupRef_1 = editor.getCurrentGroup();
        // 親グループの直下にある選択中のノートの検索
        selectionState.getSelectedNotes().forEach(function (note) {
            selectedPairList.push(new NoteAndOnsetPair(note, parentGroupRef_1));
        });
        // 選択中の子グループの検索
        selectionState.getSelectedGroups().forEach(function (groupRefs) {
            var group = groupRefs.getTarget();
            var noteCount = group.getNumNotes();
            for (var noteIndex = 0; noteIndex < noteCount; noteIndex++) {
                var note = group.getNote(noteIndex);
                selectedPairList.push(new NoteAndOnsetPair(note, groupRefs));
            }
        });
        // タイムライン順でノートをソートする
        selectedPairList.sort(function (a, b) {
            return a.onset - b.onset;
        });
    }
    return selectedPairList;
}
/**
 * ローマ字入力の歌詞の音素数を調べます。
 * @param lyrics
 */
function getRomajiPhonemeCount(lyrics) {
    var count = 0;
    var lastLength = 0;
    while (lastLength !== lyrics.length) {
        lastLength = lyrics.length;
        if (lyrics.match(/^([.])\1/)) {
            // 子音の重ねチェック
            lyrics = lyrics.slice(1);
            count++;
        }
        else {
            var result = lyrics.match(/^(?:[aiueoNjzfvwy]|ch|t[sy]?|s(?:h|il)?|[dkghbpnmr]y?)(.*)/);
            if (result !== null) {
                if (result.length > 1) {
                    lyrics = result[1];
                }
                else {
                    lyrics = '';
                }
                count++;
            }
            else {
                lyrics = lyrics.slice(1);
            }
        }
    }
    return count;
}
/**
 * ノートに含まれる音素の数を返します。
 * 音素が入力されていない場合は歌詞から推測します。
 *
 * @param note
 */
function getMultiplePhonemeCount(note) {
    var phonemes = note.getPhonemes();
    if (phonemes !== '') {
        return phonemes.trim().split(/\s+/).length;
    }
    else {
        // 音素が無い場合は歌詞の内容から推測します
        var lyrics = note.getLyrics().replace(/[\s　]/g, '');
        if (lyrics.match(/^[-a-z]+$/i)) {
            // ローマ字
            return getRomajiPhonemeCount(lyrics);
        }
        else {
            // 単一音素のひらがなカタカナ（漢字は対象外）
            var count = 0;
            while (lyrics !== '' && lyrics !== undefined) {
                if (lyrics.match(/^[あいうえおをんぁぃぅぇぉっアイウエオヲンァィゥェォッー](.*)/)) {
                    lyrics = RegExp.$1;
                    count++;
                    continue;
                }
                if (lyrics.match(/^.[ぁぃぅぇぉァィゥェォ]?(.*)/)) {
                    lyrics = RegExp.$1;
                    count += 2;
                    continue;
                }
                break;
            }
            return count;
        }
    }
}
/**
 * ノートに含まれる音素の数を返します。
 * 音素が入力されていない場合は歌詞から推測します。
 *
 * @param note
 */
function hasMultiplePhonemes(note) {
    return getMultiplePhonemeCount(note) > 1;
}
/**
 * 子音と母音ノートのペア管理オブジェクトです。
 */
var ConsonantAndVowelPair = /** @class */ (function () {
    /**
     * @param note ノート。
     * @param ref ノートが登録されているグループ参照。
     */
    function ConsonantAndVowelPair(note, ref) {
        this.ref = ref;
        /**
         * ブリック単位の再生位置。
         */
        this.onset = 0;
        /**
         * 母音ノート。
         */
        this.vowelNote = undefined;
        // 子音ノートの設定
        this.consonantNote = note;
        // 隣接する直前の母音ノートの設定
        var group = ref.getTarget();
        if (note.getIndexInParent() > 0) {
            var prevNote = group.getNote(note.getIndexInParent() - 1);
            if (prevNote.getOnset() + prevNote.getDuration() ===
                note.getOnset()) {
                this.vowelNote = prevNote;
            }
        }
        // 再生位置を更新
        this.updateOnset();
    }
    /**
     * 再生位置を更新します。
     */
    ConsonantAndVowelPair.prototype.updateOnset = function () {
        this.onset = this.consonantNote.getOnset() + this.ref.getOnset();
    };
    /**
     * 現在の長さを取得します。
     */
    ConsonantAndVowelPair.prototype.getPhonemeLength = function () {
        var value = 0;
        var durList;
        // 子音の長さ計算
        durList = this.consonantNote.getAttributes().dur;
        if (durList !== undefined && durList.length > 0) {
            value += durList[0] - 1.0;
        }
        // 母音の長さ計算
        if (this.vowelNote !== undefined) {
            durList = this.vowelNote.getAttributes().dur;
            if (durList !== undefined && durList.length > 0) {
                value -= durList[0] - 1.0;
            }
        }
        // 戻り値
        return value;
    };
    /**
     * 現在の長さを設定します。
     */
    ConsonantAndVowelPair.prototype.setPhonemeLength = function (value) {
        var durList;
        var partValue;
        // 子音の長さ計算
        durList = this.consonantNote.getAttributes().dur || [];
        partValue =
            Math.round(Math.max(-0.8, Math.min(0.8, value)) * 100) * 0.01;
        durList[0] = 1.0 + partValue;
        this.consonantNote.setAttributes({
            dur: durList,
        });
        // 母音の長さ計算
        if (this.vowelNote !== undefined) {
            var phonemeCount = getMultiplePhonemeCount(this.vowelNote);
            if (phonemeCount > 0) {
                partValue = -Math.round((value - partValue) * 100) * 0.01;
                durList[phonemeCount - 1] = 1.0 + partValue;
                this.vowelNote.setAttributes({
                    dur: durList,
                });
            }
        }
        // 戻り値
        return value;
    };
    return ConsonantAndVowelPair;
}());
/**
 * SynthesizerVでスクリプトが実行されるときに呼び出される関数。
 */
function main() {
    var editor = SV.getMainEditor();
    // 選択中のノートと位置のペアリストを取得
    var onsetPairList = getSelectedNotePairListFromAllGroups(editor);
    var cvPairList = [];
    if (onsetPairList.length > 0) {
        // 対象ノートのリストを子音ノートと直前母音ノートのペアに変換
        onsetPairList.forEach(function (e) {
            if (hasMultiplePhonemes(e.note)) {
                // 子音を含むノートのみ追加
                cvPairList.push(new ConsonantAndVowelPair(e.note, e.ref));
            }
        });
        // 子音が見つかった場合は長さの調節を行う
        if (cvPairList.length > 0) {
            var oldMinValue_1 = 0;
            var oldMaxValue_1 = 0;
            cvPairList.forEach(function (e) {
                var value = e.getPhonemeLength();
                if (oldMinValue_1 > value) {
                    oldMinValue_1 = value;
                }
                if (oldMaxValue_1 < value) {
                    oldMaxValue_1 = value;
                }
            });
            var dialogResult = SV.showCustomDialog({
                title: SV.T(ScriptMessages.scriptTitle),
                message: SV.T(ScriptMessages.PhonemeDurationDescription),
                buttons: 'OkCancel',
                widgets: [
                    {
                        type: "Slider" /* Slider */,
                        name: 'duration',
                        label: SV.T(ScriptMessages.PhonemeDurationCaption),
                        default: (Math.abs(oldMaxValue_1) >= Math.abs(oldMinValue_1)
                            ? oldMaxValue_1
                            : oldMinValue_1) * 100,
                        minValue: -160,
                        maxValue: 160,
                        format: '%1.0f',
                        interval: 10,
                    },
                ],
            });
            var newValue_1 = dialogResult.answers.duration * 0.01;
            if (dialogResult.status) {
                cvPairList.forEach(function (pair) {
                    pair.setPhonemeLength(newValue_1);
                });
            }
        }
        else {
            SV.showMessageBox(SV.T(ScriptMessages.scriptTitle), SV.T(ScriptMessages.SelectedConsonantNotesDoesNotExist));
        }
    }
    else {
        SV.showMessageBox(SV.T(ScriptMessages.scriptTitle), SV.T(ScriptMessages.SelectedNotesDoesNotExist));
    }
    SV.finish();
}
