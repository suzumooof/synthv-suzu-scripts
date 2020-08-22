SynthV用 自作スクリプト集（スズモフ作）
====

Synthesizer V Studio のPro版で利用可能な自作のスクリプト集です。

お試しのついでにいくつか作ってみたので公開します。

[![](https://user-images.githubusercontent.com/70054457/90955074-3d7c6f00-e4b5-11ea-84fd-49d3a2c23995.jpg)](http://www.youtube.com/watch?v=pogybmk_VyU "スクリプトの紹介動画")

[スクリプトの簡単な紹介動画(Youtube)](http://www.youtube.com/watch?v=pogybmk_VyU)

## 🔽 ダウンロード

<img src="https://img.shields.io/badge/version-1.0.0-green.svg">

[SynthV用スクリプトのダウンロード](https://github.com/suzumof/synthv-suzu-scripts/releases/download/v1.0.0/SynthVSuzuScripts1.0.0.zip)

## 💻 インストール方法

Synthesizer V Studio Pro のスクリプトフォルダにスクリプトファイルをコピーしてください。

その後、本体のスクリプトメニューから再スキャンを選ぶとスクリプトが利用可能になります。

## 🧰 動作環境

- Windows版のSynthesizer V Studio Pro Ver.1.0.5で動作確認しています。

- フリーのBasic版についてはスクリプト機能を利用する事ができません。

- 本体側のバージョンアップなどによってスクリプトの互換性が無くなる可能性があります。その点はご了承下さい。

- スクリプトの利用によってエラーなどのトラブルが起こる可能性もある為、事前にプロジェクトファイルの保存を行っておく事をお勧めします。

## 🎁 収録スクリプトの紹介

- ### ▶ 再生関連 (playback)

    - #### フレーズのリピート再生 (RepeatPlayOfCurrentPhrase.js)
      
      >現在の再生位置に一番近いフレーズをリピート再生します。
      ノート間に隙間があったら別のフレーズとして扱います。
      
      >再生範囲の前後に余白を追加するオプションがあります。
      こちらについてはスクリプトファイルを直接エディタで開いて数値の編集を行ってください。

    - #### 次のフレーズのリピート再生 (RepeatPlayOfNextPhrase.js)
    - #### 前のフレーズのリピート再生 (RepeatPlayOfPrevPhrase.js)
    
      >現在の再生位置からその前後のフレーズをリピート再生します。
       基本的な動作については「フレーズのリピート再生」と同じです。
       ショートカットキー登録しておくと続けて前後のフレーズに移動できます。
      
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
    - #### 前のノートを選択 (SelectPrevNote.js)
      
      >現在選択中のノートの前後のノートを選択します。
      もし選択中のノートが存在しない場合は再生位置に一番近いノートを選択します。

      >編集中以外のグループに含まれるノートは選択対象になりません。
    
    - #### 先頭音素の長さ設定 (SetFirstPhonemeDuration.js)
      
      >現在選択されているノートやグループの先頭音素の長さを設定します。
      もし複数のノートが選択されている場合は一括で変更します。
      長さの数値は20から180までの範囲で設定可能です。

## ⌨ ショートカットキー登録について (SynthV Ver.1.0.5)

- Synthesizer V Studio Ver.1.0.5はショートカットキー関連でいくつか不具合があるようです。

- スクリプトに登録したキーが再起動後にリセットされる場合があるので、そのときは再度登録してあげてください。

## ⚠ 注意事項

- スクリプトの利用は自己責任でお願いします。

- スクリプトの利用によって起きた問題については、Synthesizer Vの開発元や販売元にはお問い合わせを行わないようにお願いします。

- スクリプトの改造や再配布などはライセンスの範囲であればご自由に行ってもらって大丈夫です。

## 📕 更新履歴

- 2020/8/22 - Ver.1.0.0 初版公開。

## 📩 連絡先

- スズモフのTwitter - https://twitter.com/suzu_dov

## Licence

- Copyright (c) 2020 スズモフ
- Released under the MIT license
- https://opensource.org/licenses/mit-license.php
