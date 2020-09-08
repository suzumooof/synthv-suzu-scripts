"use strict";
/**
 * Synthesizer V Studio で利用可能な
 * 「パラメータをグループ内に移す」のスクリプトです。
 *
 * 選択中のグループに対して、その外側に設定されているパラメータをグループ内に移します。
 * グループに隣接する他のグループやノートが存在する場合、
 * パラメータのつながりがおかしくなる可能性があるため、注意してください。
 *
 * Copyright (c) 2020 スズモフ
 * Released under the MIT license
 * https://opensource.org/licenses/mit-license.php
 *
 * @author スズモフ - https://twitter.com/suzu_dov
 * @version 1.0.0
 */
/**
 * スクリプトの設定。
 * お好みに合わせて数値を書き換えて下さい。
 */
var scriptConfig = {
    /**
     * パラメータを移す際のグループ前のチェック範囲です。
     * グループ前の指定した区間に制御点が書き込まれている場合は一緒に移します。
     * 初期値は 0.25 (拍) です。
     */
    paddingBeforeBeat: 0.25,
    /**
     * パラメータを移す際のグループ後のチェック範囲です。
     * グループ後の指定した区間に制御点が書き込まれている場合は一緒に移します。
     * 初期値は 0.25 (拍) です。
     */
    paddingAfterBeat: 0.25,
};
/**
 * スクリプトの情報を返します。
 */
function getClientInfo() {
    return {
        name: SV.T('pack parameter to group'),
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
                ['pack parameter to group', 'パラメータをグループ内に移す'],
                ['No group is selected.', 'グループが選択されていません。'],
            ];
    }
    return [];
}
/**
 * ノートとグループ参照のペアオブジェクトです。
 * グループ化されているノートはプロジェクト上の複数の場所に出現する可能性があります。
 * その為、精確なタイムライン上の位置を知るにはグループ参照の情報が必要です。
 */
var PackParameterToGroup = /** @class */ (function () {
    /**
     * @param note ノート。
     * @param ref ノートが登録されているグループ参照。
     */
    function PackParameterToGroup(note, ref) {
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
    PackParameterToGroup.prototype.updateOnset = function () {
        this.onset = this.note.getOnset() + this.ref.getOnset();
    };
    return PackParameterToGroup;
}());
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
        var resultNote = searchNoteOnGroupByBlick(currentOnset, ref);
        if (typeof resultNote !== 'undefined' &&
            resultNote.getIndexInParent() > 0) {
            var resultPair = new NoteAndOnsetPair(ref.getTarget().getNote(resultNote.getIndexInParent() - 1), ref);
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
 * SynthesizerVでスクリプトが実行されるときに呼び出される関数。
 */
function main() {
    var editor = SV.getMainEditor();
    var selection = editor.getSelection();
    var groups = selection.getSelectedGroups();
    var parentGroupRef = editor.getCurrentGroup();
    var parentGroup = parentGroupRef.getTarget();
    var currentTrack = editor.getCurrentTrack();
    var parameterTypes = [
        "pitchDelta" /* pitchDelta */,
        "vibratoEnv" /* vibratoEnv */,
        "loudness" /* loudness */,
        "tension" /* tension */,
        "breathiness" /* breathiness */,
        "voicing" /* voicing */,
        "gender" /* gender */,
    ];
    // 選択中のグループが無ければ終了する
    if (groups.length === 0) {
        SV.showMessageBox(SV.T('pack parameter to group'), SV.T('No group is selected.'));
        SV.finish();
        return;
    }
    // グループごとに処理
    groups.forEach(function (childGroupRef) {
        var childGroup = childGroupRef.getTarget();
        var parentOnset = parentGroupRef.getOnset();
        var childOnset = childGroupRef.getOnset();
        var groupOffset = childOnset - parentOnset;
        var groupStart = groupOffset;
        var groupEnd = groupStart + childGroupRef.getDuration();
        // 前後のノートの位置を調べて制御位置の取得範囲を決める
        var prevPair = searchPrevNoteOnTrackByBlick(groupStart, currentTrack);
        var nextPair = searchNextNoteOnTrackByBlick(groupEnd, currentTrack);
        if (prevPair !== undefined) {
            var prevEdge = prevPair.onset + prevPair.note.getDuration();
            groupStart = Math.max((groupStart + prevEdge) / 2, groupStart - SV.QUARTER * scriptConfig.paddingBeforeBeat);
        }
        if (nextPair !== undefined) {
            var nextEdge = nextPair.onset;
            groupEnd = Math.min((groupEnd + nextEdge) / 2, groupEnd + SV.QUARTER * scriptConfig.paddingAfterBeat);
        }
        var groupDuration = groupEnd - groupStart;
        parameterTypes.forEach(function (typeName) {
            var parentAutomation = parentGroup.getParameter(typeName);
            var parameterDefs = parentAutomation.getDefinition();
            var points = parentAutomation.getPoints(groupStart, groupEnd);
            // グループの周囲でパラメータが変更されているかどうか
            var parameterChanged = false;
            if (parentAutomation.get(groupStart) !==
                parameterDefs.defaultValue ||
                parentAutomation.get(groupEnd) !== parameterDefs.defaultValue) {
                parameterChanged = true;
            }
            // 制御点がある場合もしくは前後が初期値以外の場合
            if (points.length >= 1 || parameterChanged) {
                var childAutomation_1 = childGroup.getParameter(typeName);
                // 子グループの制御点の保存
                var childStartValue = childAutomation_1.get(groupStart - groupOffset);
                var childEndValue = childAutomation_1.get(groupEnd - groupOffset);
                var childParamList_1 = [];
                points.forEach(function (pointPair) {
                    childParamList_1.push(childAutomation_1.get(pointPair[0] - groupOffset));
                });
                // 親グループの制御点の保存
                var parentBeforeValue = parentAutomation.get(groupStart - 1);
                var parentAfterValue = parentAutomation.get(groupStart + groupDuration + 1);
                // 子グループの値の再設定
                childAutomation_1.add(groupStart - groupOffset - 1, parameterDefs.defaultValue);
                childAutomation_1.add(groupStart - groupOffset, childStartValue + parentAutomation.get(groupStart));
                points.forEach(function (pointPair, index) {
                    childAutomation_1.add(pointPair[0] - groupOffset, childParamList_1[index] + pointPair[1]);
                });
                childAutomation_1.add(groupEnd - groupOffset, childEndValue +
                    parentAutomation.get(groupStart + groupDuration));
                childAutomation_1.add(groupEnd - groupOffset + 1, parameterDefs.defaultValue);
                // 親グループの値の再設定
                points.forEach(function (pointPair, index) {
                    parentAutomation.remove(pointPair[0]);
                });
                parentAutomation.add(groupStart - 1, parentBeforeValue);
                parentAutomation.add(groupStart, parameterDefs.defaultValue);
                parentAutomation.add(groupStart + groupDuration, parameterDefs.defaultValue);
                parentAutomation.add(groupStart + groupDuration + 1, parentAfterValue);
            }
        });
    });
    SV.finish();
}
