"use strict";
/**
 * Synthesizer V Studio で利用可能な
 * 「ノート端を再生位置に揃える」のスクリプトです。
 *
 * 現在の再生位置から一番近いノートの端を再生位置に揃えます。
 * 既に位置が揃っている場合はクオンタイズ設定に合わせてグリッドに吸着させます。
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
    scriptTitle: 'Fit note edge to playhead',
    noteNotExist: 'No notes were found on the current track.',
};
/**
 * 文章の翻訳テーブルを返します。
 */
function getTranslations(langCode) {
    switch (langCode) {
        case 'ja-jp':
            return [
                [ScriptMessages.menuName, 'ノート編集'],
                [ScriptMessages.scriptTitle, 'ノート端を再生位置に揃える'],
                [
                    ScriptMessages.noteNotExist,
                    '現在のトラックにノートが見つかりませんでした。',
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
 * グループ内で指定されたブリック位置以降のノートを検索します。
 * @param onset
 * @param ref
 */
function searchNoteOnGroupByBlick(onset, ref) {
    var group = ref.getTarget();
    var borderBlickOnGroup = onset - ref.getOnset();
    var noteCount = group.getNumNotes();
    if (noteCount > 0) {
        // ブリック位置に一番近いノートを探す
        var noteLeft = 0;
        var noteRight = noteCount;
        var noteIndex = Math.floor((noteRight - noteLeft) / 2);
        var currentNote = void 0;
        while (noteLeft < noteRight - 1) {
            currentNote = group.getNote(noteIndex);
            if (borderBlickOnGroup < currentNote.getOnset()) {
                noteRight = noteIndex;
                noteIndex -= Math.floor((noteRight - noteLeft) / 2);
            }
            else {
                noteLeft = noteIndex;
                noteIndex += Math.floor((noteRight - noteLeft) / 2);
            }
        }
        // 位置が完全一致するか調べる
        currentNote = group.getNote(noteLeft);
        var currentOnset = currentNote.getOnset();
        if (borderBlickOnGroup <= currentOnset) {
            // 完全一致するかそれよりも手前だったらそのノートを返す
            return currentNote;
        }
        else if (noteLeft + 1 < noteCount) {
            // 異なる場合はその後ろのノートを返す
            return group.getNote(noteLeft + 1);
        }
        else {
            // 後ろにノートが無い場合は検索に失敗
        }
    }
    return undefined;
}
/**
 * トラック内で指定されたブリック位置直前のノートを検索します。
 * @param currentOnset
 * @param track
 */
function searchPrevNotePairOnTrackByBlick(currentOnset, track) {
    var nearPair;
    var maxOnset = 0;
    // グループ内のノートを探す
    for (var refIndex = 0; refIndex < track.getNumGroups(); refIndex++) {
        var ref = track.getGroupReference(refIndex);
        var group = ref.getTarget();
        var resultNote = searchNoteOnGroupByBlick(currentOnset, ref);
        var resultIndex = group.getNumNotes();
        if (resultNote !== undefined) {
            resultIndex = resultNote.getIndexInParent();
        }
        if (resultIndex > 0) {
            var resultPair = new NoteAndOnsetPair(group.getNote(resultIndex - 1), ref);
            if (resultPair.onset < currentOnset &&
                resultPair.onset > maxOnset) {
                nearPair = resultPair;
                maxOnset = resultPair.onset;
            }
        }
    }
    return nearPair;
}
/**
 * トラック内で指定されたブリック位置直後のノートを検索します。
 * @param currentOnset
 * @param track
 */
function searchNextNotePairOnTrackByBlick(currentOnset, track) {
    var nearPair;
    var minOnset = Number.MAX_VALUE;
    // グループ内のノートを探す
    for (var refIndex = 0; refIndex < track.getNumGroups(); refIndex++) {
        var ref = track.getGroupReference(refIndex);
        var resultNote = searchNoteOnGroupByBlick(currentOnset, ref);
        if (typeof resultNote !== 'undefined') {
            var resultPair = new NoteAndOnsetPair(resultNote, ref);
            if (resultPair.onset >= currentOnset &&
                resultPair.onset < minOnset) {
                nearPair = resultPair;
                minOnset = resultPair.onset;
            }
        }
    }
    return nearPair;
}
/**
 * トラック内で指定されたブリック位置以降のノートを検索します。
 * @param onset ノートの検索位置（ブリック単位）
 * @param track 対象トラック
 * @param findType ノートの検索位置。 "both"は前後のノートを調べます。
 *                 "before", "after"は前と後ろいずれかのノートを調べます。
 */
function searchNotePairOnTrackByBlick(onset, track, findType) {
    var groupCount = track.getNumGroups();
    var bestScore = -1;
    var bestPair;
    for (var groupIndex = 0; groupIndex < groupCount; groupIndex++) {
        var ref = track.getGroupReference(groupIndex);
        var group = ref.getTarget();
        var borderBlickOnGroup = onset - ref.getOnset();
        if (group.getNumNotes() > 0) {
            var childNote = searchNoteOnGroupByBlick(onset, ref);
            // 直前のノートの方がボーダー位置に近ければそちらに差し替える
            // 検索タイプが before や after の場合は内容を見て判断する
            if (findType !== 'after') {
                if (childNote !== undefined) {
                    var noteIndex = childNote.getIndexInParent();
                    if (noteIndex === 0) {
                        if (findType === 'before') {
                            childNote = undefined;
                        }
                    }
                    else {
                        var prevNote = group.getNote(noteIndex - 1);
                        if (findType === 'before') {
                            childNote = prevNote;
                        }
                        else {
                            var prevRight = prevNote.getOnset() + prevNote.getDuration();
                            if (borderBlickOnGroup < prevRight ||
                                Math.abs(childNote.getOnset() - borderBlickOnGroup) > Math.abs(prevRight - borderBlickOnGroup)) {
                                childNote = prevNote;
                            }
                        }
                    }
                }
                else {
                    childNote = group.getNote(group.getNumNotes() - 1);
                }
            }
            // 他のグループと比較して一番近いノートがどちらかを調べる
            if (childNote !== undefined) {
                var childPair = new NoteAndOnsetPair(childNote, ref);
                var childScore = void 0;
                if (onset < childPair.onset) {
                    childScore = childPair.onset - onset;
                }
                else if (onset >
                    childPair.onset + childPair.note.getDuration()) {
                    childScore =
                        onset -
                            (childPair.onset + childPair.note.getDuration());
                }
                else {
                    childScore = 0;
                }
                if (bestScore === -1 || bestScore > childScore) {
                    bestScore = childScore;
                    bestPair = childPair;
                }
            }
        }
    }
    if (bestPair !== undefined) {
        return bestPair;
    }
    else {
        return undefined;
    }
}
/**
 * SynthesizerVでスクリプトが実行されるときに呼び出される関数。
 */
function main() {
    var project = SV.getProject();
    var playback = SV.getPlayback();
    var editor = SV.getMainEditor();
    var axis = project.getTimeAxis();
    var track = editor.getCurrentTrack();
    var navigation = editor.getNavigation();
    var selectionState = editor.getSelection();
    var currentGroupRef = editor.getCurrentGroup();
    // 再生位置の取得
    var currentPlayhead = axis.getBlickFromSeconds(playback.getPlayhead());
    var nearNotePair = searchNotePairOnTrackByBlick(currentPlayhead, track, 'both');
    var beforePair;
    var afterPair;
    var isAlreadyFit = false;
    if (nearNotePair !== undefined) {
        // 前後のどちらと近いか確認する
        var noteCenter = nearNotePair.onset + nearNotePair.note.getDuration() / 2;
        var isNearPrev = currentPlayhead < noteCenter;
        // もし直前や直後が選択済みであればそちらを優先する
        var nearNoteIndex_1 = nearNotePair.note.getIndexInParent();
        if (nearNotePair.ref.getTarget().getUUID() ===
            currentGroupRef.getTarget().getUUID()) {
            var selectedNotes_1 = selectionState.getSelectedNotes();
            if (selectedNotes_1.length === 2) {
                var otherNote_1;
                selectedNotes_1.forEach(function (note, index) {
                    if (nearNoteIndex_1 === note.getIndexInParent()) {
                        otherNote_1 = selectedNotes_1[1 - index];
                    }
                });
                if (otherNote_1 !== undefined) {
                    if (nearNoteIndex_1 - 1 === otherNote_1.getIndexInParent()) {
                        isNearPrev = true;
                    }
                    if (nearNoteIndex_1 + 1 === otherNote_1.getIndexInParent()) {
                        isNearPrev = false;
                    }
                }
            }
        }
        // 近い方向の端と隣接するノートを探す
        if (isNearPrev) {
            afterPair = nearNotePair;
            beforePair = searchPrevNotePairOnTrackByBlick(afterPair.onset, track);
            isAlreadyFit = currentPlayhead === afterPair.onset;
            if (beforePair !== undefined) {
                if (beforePair.onset + beforePair.note.getDuration() !==
                    afterPair.onset) {
                    beforePair = undefined;
                }
            }
        }
        else {
            beforePair = nearNotePair;
            afterPair = searchNextNotePairOnTrackByBlick(beforePair.onset + beforePair.note.getDuration(), track);
            isAlreadyFit =
                currentPlayhead ===
                    beforePair.onset + beforePair.note.getDuration();
            if (afterPair !== undefined) {
                if (beforePair.onset + beforePair.note.getDuration() !==
                    afterPair.onset) {
                    afterPair = undefined;
                }
            }
        }
        // 既に位置合わせ済みかどうかを確認して処理を変える
        var offset = void 0;
        if (isAlreadyFit) {
            currentPlayhead = navigation.snap(currentPlayhead);
            // スナップ後の位置に問題が生じないか確認する
            if (beforePair !== undefined) {
                if (currentPlayhead < beforePair.onset) {
                    beforePair = undefined;
                    afterPair = undefined;
                }
            }
            if (afterPair !== undefined) {
                if (currentPlayhead >
                    afterPair.onset + afterPair.note.getDuration()) {
                    beforePair = undefined;
                    afterPair = undefined;
                }
            }
        }
        // ノート端の位置を変更する
        if (beforePair !== undefined) {
            offset = beforePair.ref.getOnset();
            beforePair.note.setDuration(currentPlayhead - beforePair.onset);
        }
        if (afterPair !== undefined) {
            offset = afterPair.ref.getOnset();
            afterPair.note.setDuration(afterPair.onset + afterPair.note.getDuration() - currentPlayhead);
            afterPair.note.setOnset(currentPlayhead - offset);
        }
    }
    else {
        SV.showMessageBox(SV.T(ScriptMessages.scriptTitle), SV.T(ScriptMessages.noteNotExist));
    }
    SV.finish();
}
