"use strict";
/**
 * Synthesizer V Studio で利用可能な
 * 「先頭音素の長さ設定」のスクリプトです。
 *
 * 選択中のノートに含まれる先頭音素の長さを20～180の範囲で設定します。
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
        name: SV.T('set first phoneme duration'),
        category: SV.T('edit note'),
        author: 'スズモフ',
        versionNumber: 1,
        minEditorVersion: 0x10003,
    };
}
/**
 * 文章の翻訳テーブルを返します。
 */
function getTranslations(langCode) {
    switch (langCode) {
        case 'ja-jp':
            return [
                ['edit note', 'ノート編集'],
                ['phoneme duration', '音素の長さ'],
                ['set first phoneme duration', '先頭音素の長さ設定'],
                [
                    'set first phoneme duration on selected notes',
                    '現在選択中の全てのノートに対して先頭音素の長さを設定します。',
                ],
                [
                    'selected notes does not exit',
                    '操作対象のノートが選択されていません',
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
 * @param ref
 */
function hasMultiplePhonemes(note, ref) {
    var phonemes = note.getPhonemes();
    if (phonemes !== '') {
        return phonemes.trim().split(/\s+/).length > 1;
    }
    else {
        // 音素が無い場合は歌詞の内容から推測します
        var lyrics = note.getLyrics().replace(/[\s　]/g, '');
        if (lyrics.match(/^[-a-z]+$/i)) {
            // ローマ字
            return getRomajiPhonemeCount(lyrics) >= 2;
        }
        else {
            // 単一音素のひらがなカタカナ（漢字は対象外）
            return !lyrics.match(/^[あいうえおをんぁぃぅぇぉっアイウエオヲンァィゥェォッー]$/);
        }
    }
}
/**
 * SynthesizerVでスクリプトが実行されるときに呼び出される関数。
 */
function main() {
    var editor = SV.getMainEditor();
    var selection = editor.getSelection();
    // 選択中のノートと位置のペアリストを取得
    var pairList = getSelectedNotePairListFromAllGroups(editor);
    if (pairList.length > 0) {
        var oldValue = 1.0;
        var oldDurList = pairList[0].note.getAttributes().dur;
        if (oldDurList !== undefined && oldDurList.length > 0) {
            oldValue = oldDurList[0];
        }
        var dialogResult = SV.showCustomDialog({
            title: SV.T('set first phoneme duration'),
            message: SV.T('set first phoneme duration on selected notes'),
            buttons: 'YesNoCancel',
            widgets: [
                {
                    type: "Slider" /* Slider */,
                    name: 'duration',
                    label: SV.T('phoneme duration'),
                    default: oldValue * 100,
                    minValue: 20,
                    maxValue: 180,
                    format: '%1.0f',
                    interval: 10,
                },
            ],
        });
        var newValue_1 = dialogResult.answers.duration * 0.01;
        if (dialogResult.status === "Yes" /* Yes */) {
            pairList.forEach(function (pair) {
                var durList = pair.note.getAttributes().dur || [];
                durList[0] = newValue_1;
                pair.note.setAttributes({
                    dur: durList,
                });
            });
        }
        // グループの選択を解除
        selection.clearGroups();
    }
    else {
        SV.showMessageBox(SV.T('set first phoneme duration'), SV.T('selected notes does not exit'));
    }
    SV.finish();
}
