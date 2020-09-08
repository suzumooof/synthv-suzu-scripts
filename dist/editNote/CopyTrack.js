"use strict";
/**
 * Synthesizer V Studio で利用可能な
 * 「トラックの複製」のスクリプトです。
 *
 * 現在選択中のトラックを複製します。
 *
 * Copyright (c) 2020 スズモフ
 * Released under the MIT license
 * https://opensource.org/licenses/mit-license.php
 *
 * @author スズモフ - https://twitter.com/suzu_dov
 * @version 1.0.0
 */
/**
 * スクリプトの情報を返します。
 */
function getClientInfo() {
    return {
        name: SV.T('copy track'),
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
                ['copy track', 'トラックの複製'],
            ];
    }
    return [];
}
/**
 * SynthesizerVでスクリプトが実行されるときに呼び出される関数。
 */
function main() {
    var editor = SV.getMainEditor();
    var currentTrack = editor.getCurrentTrack();
    var project = SV.getProject();
    project.addTrack(currentTrack.clone());
    SV.finish();
}
