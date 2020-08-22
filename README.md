SynthV用 自作スクリプト集
====

Synthesizer V Studio で利用可能な自作のスクリプト集です。

お試しのついでにいくつか作ってみたので公開します。

## 🔽 ダウンロード

<img src="https://img.shields.io/badge/version-1.0.0-green.svg">

[SynthV用スクリプトのダウンロード](https://github.com/suzumof/synthv-suzu-scripts/releases/download/v1.0.0/SynthVSuzuScripts1.0.0.zip)

## 💻 インストール方法

Synthesizer V Studio のスクリプトフォルダにスクリプトファイルをコピーしてください。

その後、本体のスクリプトメニューから再スキャンを選ぶとスクリプトが利用可能になります。

## 🧰 動作環境

Windows版のSynthesizer V Studio Ver.1.0.5で動作確認しています。
バージョンの違いによってスクリプトの互換性が無くなる可能性があります。

スクリプトの利用によってエラーなどのトラブルが起こる可能性もある為、事前にプロジェクトファイルの保存を行っておく事をお勧めします。

## 🎁 収録スクリプトの紹介

- ### ▶ 再生関連 (playback)

    - #### フレーズのリピート再生 (RepeatPlayOfCurrentPhrase.js)
      
      >現在の再生位置に一番近いフレーズをリピート再生します。
      ノート間に隙間があったら別のフレーズとして扱います。

    - #### 次のフレーズのリピート再生 (RepeatPlayOfNextPhrase.js)
    
      >現在の再生位置からその一つ次のフレーズをリピート再生します。
       基本的な動作は「フレーズのリピート再生」と同じです。
      
    - #### 前のフレーズのリピート再生 (RepeatPlayOfPrevPhrase.js)
    
      >現在の再生位置からその一つ前のフレーズをリピート再生します。
       基本的な動作は「フレーズのリピート再生」と同じです。
      
    - #### 選択範囲のリピート再生 (RepeatPlayOfSelectedNotes.js)
    
      >現在選択中のノートやグループの置かれている範囲をリピート再生します。

- ### ⭐ ノート編集関連 (editNote)

    - #### 選択ノートを複数音素で絞り込み (FilterNoteWithMultiplePhonemes.js)
    
      >現在選択中のノートで複数の音素を含むものだけを絞り込んで再選択します。
      日本語の歌声データベース以外では正常に動作しない可能性があります。
    
    - #### 選択ノートを単一音素で絞り込み (FilterNoteWithSinglePhoneme.js)
    
      >現在選択中のノートで単一の音素を含むものだけを絞り込んで再選択します。
      日本語の歌声データベース以外では正常に動作しない可能性があります。
    
    - #### 次のノートを選択 (SelectNextNote.js)
    
      >現在選択中のノートの直後のノートを選択します。
      編集中以外のグループに含まれるノートは選択対象になりません。
    
    - #### 前のノートを選択 (SelectPrevNote.js)
      
      >現在選択中のノートの直前のノートを選択します。
      編集中以外のグループに含まれるノートは選択対象になりません。
    
    - #### 先頭音素の長さ設定 (SetFirstPhonemeDuration.js)
      
      >現在選択されているノートやグループの先頭音素の長さを設定します。
      もし複数のノートが選択されている場合は一括で変更します。
      長さの数値は10刻みで20から180までの範囲で設定可能です。

## ⌨ ショートカットキー登録について (SynthV Ver.1.0.5)

Synthesizer V StudioのVer.1.0.5はショートカットキー関連でいくつか不具合があるようです。

スクリプトに登録したキーが再起動後にリセットされる場合があるので、そのときは再度登録してあげてください。

## ⚠ 注意事項

- スクリプトの利用は自己責任でお願いします。

- スクリプトの利用によって起きた問題については、Synthesizer Vの開発元や販売元にはお問い合わせを行わないようにお願いします。

## 📕 更新履歴

- 2020/8/22 - Ver.1.0.0 初版公開。

## 📩 連絡先

- スズモフのTwitter - https://twitter.com/suzu_dov

## Licence

- Copyright (c) 2020 スズモフ
- Released under the MIT license
- https://opensource.org/licenses/mit-license.php
    
