"use strict";
/**
 * Synthesizer V Studio で利用可能な
 * 「次のノートを選択」のスクリプトです。
 *
 * 現在操作中以外のグループに含まれるノートは選択されません。
 * そちらのノートを選択したい場合は事前にグループを開いて作業状態にしてください。
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
        name: SV.T('select next note'),
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
                ['select next note', '次のノートを選択'],
            ];
    }
    return [];
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
    // ブリック位置に一番近いノートを探す
    var noteLeft = 0;
    var noteRight = noteCount;
    var noteIndex = Math.floor((noteRight - noteLeft) / 2);
    var currentNote;
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
    var selection = editor.getSelection();
    var currentGroupRef = editor.getCurrentGroup();
    var currentGroup = currentGroupRef.getTarget();
    var targetNote;
    var selectedNotes = selection.getSelectedNotes();
    if (selectedNotes.length > 0) {
        // 選択中のノートが複数ある場合は最初を対象とする
        targetNote = selectedNotes[0];
        // 同一グループ内で次のノートを探す
        if (selectedNotes.length === 1) {
            var noteIndex = targetNote.getIndexInParent();
            if (noteIndex + 1 < currentGroup.getNumNotes()) {
                targetNote = currentGroup.getNote(noteIndex + 1);
            }
        }
    }
    else {
        // 選択中のノートが無い場合は再生位置に近いノートを探す
        var currentPlayhead = axis.getBlickFromSeconds(playback.getPlayhead());
        targetNote = searchNoteOnGroupByBlick(currentPlayhead, currentGroupRef);
        if (targetNote !== undefined && targetNote.getIndexInParent() > 0) {
            var prevNote = currentGroup.getNote(targetNote.getIndexInParent() - 1);
            var centerOnset = (targetNote.getOnset() +
                prevNote.getOnset() +
                prevNote.getDuration()) /
                2 +
                currentGroupRef.getOnset();
            if (currentPlayhead < centerOnset) {
                targetNote = prevNote;
            }
        }
    }
    // ノートの選択
    selection.clearAll();
    if (targetNote !== undefined) {
        selection.selectNote(targetNote);
    }
}
