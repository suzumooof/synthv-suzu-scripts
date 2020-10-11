"use strict";
/**
 * Synthesizer V Studio で利用可能な
 * 「選択ノートを一つ上に移動」のスクリプトです。
 *
 * 選択中のノートをピアノロール上で一つ上に移動します。
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
    scriptTitle: 'Up selecting note pitch',
};
/**
 * 文章の翻訳テーブルを返します。
 */
function getTranslations(langCode) {
    switch (langCode) {
        case 'ja-jp':
            return [
                [ScriptMessages.menuName, 'ノート編集'],
                [ScriptMessages.scriptTitle, '選択ノートを一つ上に移動'],
            ];
    }
    return [];
}
/**
 * SynthesizerVでスクリプトが実行されるときに呼び出される関数。
 */
function main() {
    var editor = SV.getMainEditor();
    var selectionState = editor.getSelection();
    var project = SV.getProject();
    var currentTrack = editor.getCurrentTrack();
    var selectedNotes = selectionState.getSelectedNotes();
    var selectedGroups = selectionState.getSelectedGroups();
    project.newUndoRecord();
    if (selectedNotes.length > 0) {
        selectedNotes.forEach(function (currentNote) {
            currentNote.setPitch(currentNote.getPitch() + 1);
        });
    }
    if (selectedGroups.length > 0) {
        selectedGroups.forEach(function (currentRef, index) {
            var newPitch = currentRef.getPitchOffset() + 1;
            var newRef = SV.create("NoteGroupReference" /* NoteGroupReference */);
            newRef.setTarget(currentRef.getTarget());
            newRef.setTimeOffset(currentRef.getTimeOffset());
            currentTrack.removeGroupReference(currentRef.getIndexInParent());
            newRef.setPitchOffset(newPitch);
            currentTrack.addGroupReference(newRef);
            selectionState.selectGroup(newRef);
            selectedGroups[index] = newRef;
        });
        // 選択状態の再登録
        selectedGroups.forEach(function (currentRef) {
            selectionState.selectGroup(currentRef);
        });
        selectedNotes.forEach(function (currentNote) {
            selectionState.selectNote(currentNote);
        });
    }
    SV.finish();
}
