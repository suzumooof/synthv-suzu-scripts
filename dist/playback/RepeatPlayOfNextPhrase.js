"use strict";
/**
 * Synthesizer V Studio で利用可能な
 * 「次のフレーズのリピート再生」のスクリプトです。
 *
 * 表示中のトラックで現在の再生位置から一番近いフレーズを探して、
 * そこからその次のフレーズ内をリピート再生します。
 * ノート間に僅かでも隙間があれば別フレーズとして扱います。
 * もし対象となるフレーズが見つからない場合は再生を停止します。
 *
 * Copyright (c) 2020 スズモフ
 * Released under the MIT license
 * https://opensource.org/licenses/mit-license.php
 *
 * @author スズモフ - https://twitter.com/suzu_dov
 * @version 1.0.0
 */
var scriptConfig = {
    /**
     * ループ再生時の先頭に追加する空き時間（秒単位）。
     * 初期値は 0.000 (0ミリ秒) です。
     */
    paddingBeforeSeconds: 0.0,
    /**
     * ループ再生時の末尾に追加する空き時間（秒単位）。
     * 初期値は 0.000 (0ミリ秒) です。
     */
    paddingAfterSeconds: 0.0,
    /**
     * ループ再生時の先頭に追加する空き時間（拍・4分音符単位）。
     * 秒数指定と拍指定を併用した場合は両方の合計時間になります。
     * 初期値は 0.25 (16分音符) です。
     */
    paddingBeforeBeat: 0.25,
    /**
     * ループ再生時の末尾に追加する空き時間（拍・4分音符単位）。
     * 秒数指定と拍指定を併用した場合は両方の合計時間になります。
     * 初期値は 0.25 (16分音符) です。
     */
    paddingAfterBeat: 0.25,
    /**
     * 選択範囲の直前と直後に置かれているノートを再生範囲から除外するかどうかの設定です。
     * ループ再生時の先頭や末尾の空き時間が設定されている場合でも、
     * 選択範囲直前や直後のノートはループ再生に含めないように調整を行います。
     */
    excludesPlaySurroundingNotes: true,
    /**
     * 非ループ時のエンドマーカーの位置（秒単位）。
     * 1時間を超える曲を扱う場合はそれよりも大きい数値に書き換えて下さい。
     * 初期値は 3600 (1時間) です。
     */
    notInLoopEndMarkerSeconds: 3600,
    /**
     * 再生中の監視タイマーの実行間隔（ミリ秒単位）。
     */
    timerIntervalMilliSeconds: 50,
};
/**
 * スクリプトの情報を返します。
 */
function getClientInfo() {
    return {
        name: SV.T('repeat play of next phrase'),
        category: SV.T('playback'),
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
                ['playback', 'プレイバック'],
                ['repeat play of next phrase', '次のフレーズのリピート再生'],
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
 * 対象となるフレーズのノートと再生位置のリストを返します。
 *
 * @param track
 * @param targetPair
 */
function getPhraseNotePairListFromAllGroups(track, targetPair) {
    var selectedPairList = [];
    var groupCount = track.getNumGroups();
    var groupInfos = [];
    var lastPairCount;
    var currentOnset;
    // グループ別の指定時間に近いノートを探します
    for (var groupIndex = 0; groupIndex < groupCount; groupIndex++) {
        var childRef = track.getGroupReference(groupIndex);
        var childGroup = childRef.getTarget();
        var borderBlickOnGroup = targetPair.onset - childRef.getOnset();
        var noteCount = childGroup.getNumNotes();
        var noteIndex = 0;
        if (noteCount > 0) {
            // 対象位置以降のノートを探す
            var childNote = searchNoteOnGroupByBlick(targetPair.onset, childRef);
            if (childNote !== undefined) {
                noteIndex = childNote.getIndexInParent();
            }
            else {
                noteIndex = noteCount;
            }
        }
        groupInfos.push({
            ref: childRef,
            group: childGroup,
            groupOnset: childRef.getOnset(),
            left: noteIndex,
            right: noteIndex,
            count: noteCount,
        });
    }
    // 対象位置から後ろのノートを検索
    lastPairCount = -1;
    currentOnset = targetPair.onset;
    while (lastPairCount !== selectedPairList.length) {
        lastPairCount = selectedPairList.length;
        for (var groupIndex = 0; groupIndex < groupCount; groupIndex++) {
            var groupInfo = groupInfos[groupIndex];
            if (groupInfo.right < groupInfo.count) {
                // ノートの隣接確認
                var childNote = groupInfo.group.getNote(groupInfo.right);
                if (currentOnset ===
                    childNote.getOnset() + groupInfo.groupOnset) {
                    selectedPairList.push(new NoteAndOnsetPair(childNote, groupInfo.ref));
                    currentOnset += childNote.getDuration();
                    groupInfo.right++;
                }
            }
        }
    }
    // 対象位置より手前のノートの検索
    lastPairCount = -1;
    currentOnset = targetPair.onset;
    while (lastPairCount !== selectedPairList.length) {
        lastPairCount = selectedPairList.length;
        for (var groupIndex = 0; groupIndex < groupCount; groupIndex++) {
            var groupInfo = groupInfos[groupIndex];
            if (groupInfo.left > 0) {
                // ノートの隣接確認
                var childNote = groupInfo.group.getNote(groupInfo.left - 1);
                if (currentOnset ===
                    childNote.getOnset() +
                        childNote.getDuration() +
                        groupInfo.groupOnset) {
                    selectedPairList.unshift(new NoteAndOnsetPair(childNote, groupInfo.ref));
                    currentOnset -= childNote.getDuration();
                    groupInfo.left--;
                }
            }
        }
    }
    // リストが空の場合
    if (selectedPairList.length === 0) {
        selectedPairList.push(targetPair);
    }
    return selectedPairList;
}
/**
 * 再生範囲のマーカー位置をリセットした上で再生を停止します。
 */
function resetPlaybackMarker(endMarkerSeconds) {
    var playback = SV.getPlayback();
    var editor = SV.getMainEditor();
    var navigation = editor.getNavigation();
    // 再生位置とピアノロールの表示位置を保存します
    var currentPlayhead = playback.getPlayhead();
    var currentTimeLeft = navigation.getTimeViewRange()[0];
    // 一度停止させます（これをしておかないと音がプツッと途切れます）
    playback.pause();
    // 再生範囲をリセットしてさらに停止させます
    playback.loop(0, endMarkerSeconds);
    playback.pause();
    // リセット時に再生位置が曲の冒頭に戻ってしまうので直前の状態に戻します
    playback.seek(currentPlayhead);
    navigation.setTimeLeft(currentTimeLeft);
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
function searchPrevNoteOnTrackByBlick(currentOnset, track) {
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
function searchNextNoteOnTrackByBlick(currentOnset, track) {
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
 * 再生範囲を前後の余白設定の内容を元に修正します。
 * @param range
 * @param axis
 * @param paddingBeforeSeconds
 * @param paddingAfterSeconds
 * @param paddingBeforeBeat
 * @param paddingAfterBeat
 */
function fixedPlaybackRangeOnPadding(range, axis, paddingBeforeSeconds, paddingAfterSeconds, paddingBeforeBeat, paddingAfterBeat) {
    // 秒数単位の選択範囲の取得
    var startSeconds = axis.getSecondsFromBlick(range.start - paddingBeforeBeat * SV.QUARTER) -
        paddingBeforeSeconds;
    var endSeconds = axis.getSecondsFromBlick(range.end + paddingAfterBeat * SV.QUARTER) +
        paddingAfterSeconds;
    return new NumberRange(axis.getBlickFromSeconds(startSeconds), axis.getBlickFromSeconds(endSeconds));
}
/**
 * 再生範囲を直前と直後のノートと重ならないように修正します。
 * @param originalRange 元々の再生範囲
 * @param currentRange 補正後の再生範囲
 * @param track 現在のトラック
 * @param axis タイミング計算用
 */
function fixedPlaybackRangeOnSurroundNotes(originalRange, currentRange, track, axis) {
    var resultRange = new NumberRange(currentRange.start, currentRange.end);
    // 直前のノート
    var prevPair = searchPrevNoteOnTrackByBlick(originalRange.start, track);
    if (prevPair !== undefined) {
        var limitStartOnset = prevPair.onset + prevPair.note.getDuration();
        limitStartOnset += (originalRange.start - limitStartOnset) * 0.51;
        if (resultRange.start < limitStartOnset) {
            resultRange.start = limitStartOnset;
        }
    }
    // 直後のノート
    var nextPair = searchNextNoteOnTrackByBlick(originalRange.end, track);
    if (nextPair !== undefined) {
        var limitEndOnset = nextPair.onset;
        limitEndOnset -= (limitEndOnset - originalRange.end) * 0.51;
        if (resultRange.end > limitEndOnset) {
            resultRange.end = limitEndOnset;
        }
    }
    return resultRange;
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
                var childScore = Math.abs(childPair.onset - onset);
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
    // 既に再生中の場合はマーカー位置をリセットする（この時点では終了しない）
    if (playback.getStatus() !== 'stopped') {
        resetPlaybackMarker(scriptConfig.notInLoopEndMarkerSeconds);
    }
    var nearNotePair;
    var pairList = [];
    var currentPlayhead = axis.getBlickFromSeconds(playback.getPlayhead());
    // 選択中の再生位置に属するノートとフレーズの取得
    nearNotePair = searchNotePairOnTrackByBlick(currentPlayhead, track, 'both');
    if (nearNotePair !== undefined) {
        pairList = getPhraseNotePairListFromAllGroups(track, nearNotePair);
    }
    // 更に次のフレーズの取得
    if (pairList.length > 0) {
        nearNotePair = pairList[pairList.length - 1];
        nearNotePair = searchNotePairOnTrackByBlick(nearNotePair.onset + nearNotePair.note.getDuration() + 1, track, 'after');
        if (nearNotePair !== undefined) {
            pairList = getPhraseNotePairListFromAllGroups(track, nearNotePair);
        }
        else {
            pairList = [];
        }
    }
    if (pairList.length === 0) {
        // 次のフレーズが存在しなかったら終了
        SV.finish();
    }
    else {
        // ブリック単位の選択範囲の取得
        var startPair = pairList[0];
        var endPair = pairList[pairList.length - 1];
        // 選択中のノートから再生範囲を取得
        var originalPlaybackRange = new NumberRange(startPair.onset, endPair.onset + endPair.note.getDuration());
        // 再生範囲の前後に余白を追加
        var fixedPlaybackRange = fixedPlaybackRangeOnPadding(originalPlaybackRange, axis, scriptConfig.paddingBeforeSeconds, scriptConfig.paddingAfterSeconds, scriptConfig.paddingBeforeBeat, scriptConfig.paddingAfterBeat);
        // 直前と直後にノートが置かれている場合は再生範囲から除外
        if (scriptConfig.excludesPlaySurroundingNotes) {
            fixedPlaybackRange = fixedPlaybackRangeOnSurroundNotes(originalPlaybackRange, fixedPlaybackRange, track, axis);
        }
        // ループ再生開始
        // 一度後ろにシークすることでその後のスクロールを最小限にする
        var startSeconds = axis.getSecondsFromBlick(fixedPlaybackRange.start);
        var endSeconds = axis.getSecondsFromBlick(fixedPlaybackRange.end);
        playback.seek(endSeconds);
        playback.seek(startSeconds);
        playback.loop(startSeconds, endSeconds);
        // 再生が終了するまで待機する
        var next_1 = function () {
            SV.setTimeout(scriptConfig.timerIntervalMilliSeconds, function () {
                // ループ再生が終了したら再生範囲をリセットします
                // この処理を行わずに終了すると範囲よりも後ろ側の再生が
                // 一切できなくなります
                if (playback.getStatus() !== 'looping') {
                    resetPlaybackMarker(scriptConfig.notInLoopEndMarkerSeconds);
                    SV.finish();
                }
                next_1();
            });
        };
        next_1();
    }
}
