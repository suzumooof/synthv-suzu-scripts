"use strict";
/**
 * Synthesizer V Studio で利用可能な
 * 「選択ノートを単一音素で絞り込み」のスクリプトです。
 *
 * 現在選択中のノートから一つのみの音瀬を含むノートのみで絞り込み検索します。
 * 音素が直接入力されていない場合は歌詞の内容から推測します。
 * グループについてはその中のノートを個別選択できないので絞り込みの対象外です。
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
        name: SV.T('filter note with single phoneme'),
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
                [
                    'filter note with single phoneme',
                    '選択ノートを単一音素で絞り込み',
                ],
            ];
    }
    return [];
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
    var currentGroupRef = editor.getCurrentGroup();
    var selectedNotes = selection.getSelectedNotes();
    if (selectedNotes.length > 0) {
        // 複数の音素を含まないノートを選択解除
        selectedNotes.forEach(function (currentNote) {
            if (hasMultiplePhonemes(currentNote, currentGroupRef)) {
                selection.unselectNote(currentNote);
            }
        });
    }
    // グループの選択を解除
    selection.clearGroups();
}
