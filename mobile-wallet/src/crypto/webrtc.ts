/**
 * Tamizhi WebRTC Manager
 *
 * Manages the full P2P WebRTC call lifecycle:
 *   1. Create RTCPeerConnection with STUN servers
 *   2. Add local media stream (audio/video)
 *   3. Create/handle SDP offer and answer
 *   4. Exchange ICE candidates via signaling server
 *   5. Manage call tear-down
 *
 * Uses react-native-webrtc for native WebRTC APIs.
 */

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { signalingClient, SignalMessage } from '../api/signaling';

// ── ICE / STUN config ──────────────────────────────────────────────────────

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// ── Types ──────────────────────────────────────────────────────────────────

export type CallType = 'audio' | 'video';

export interface WebRTCCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onCallEnded: () => void;
  onError: (err: string) => void;
  onConnectionStateChange?: (state: string) => void;
}

// ── Manager class ──────────────────────────────────────────────────────────

class TamizhiWebRTC {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private myPubKey: string | null = null;
  private remotePubKey: string | null = null;
  private callbacks: WebRTCCallbacks | null = null;
  private callType: CallType = 'audio';
  private iceCandidateBuffer: any[] = [];
  private remoteDescSet = false;

  // ── Public API ─────────────────────────────────────────────────────────

  /** Called by the caller to initiate a call. */
  async startCall(
    myPubKey: string,
    remotePubKey: string,
    callType: CallType,
    callbacks: WebRTCCallbacks,
  ): Promise<void> {
    this.myPubKey = myPubKey;
    this.remotePubKey = remotePubKey;
    this.callType = callType;
    this.callbacks = callbacks;

    await this._createPeerConnection();
    await this._addLocalStream();
    await this._createAndSendOffer();
  }

  /** Called by the callee to accept an incoming call. */
  async acceptCall(
    myPubKey: string,
    remotePubKey: string,
    callType: CallType,
    offerSDP: string,
    callbacks: WebRTCCallbacks,
  ): Promise<void> {
    this.myPubKey = myPubKey;
    this.remotePubKey = remotePubKey;
    this.callType = callType;
    this.callbacks = callbacks;

    await this._createPeerConnection();
    await this._addLocalStream();

    // Set remote description from the offer
    const offer = new RTCSessionDescription({ type: 'offer', sdp: offerSDP });
    await this.pc!.setRemoteDescription(offer);
    this.remoteDescSet = true;

    // Flush any buffered ICE candidates
    await this._flushIceCandidates();

    // Create and send answer
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);

    signalingClient.send({
      type: 'call-answer',
      from: myPubKey,
      to: remotePubKey,
      data: { sdp: answer.sdp },
    });
  }

  /** Handle an incoming 'call-answer' signal (caller side). */
  async handleAnswer(sdp: string): Promise<void> {
    if (!this.pc) return;
    const answer = new RTCSessionDescription({ type: 'answer', sdp });
    await this.pc.setRemoteDescription(answer);
    this.remoteDescSet = true;
    await this._flushIceCandidates();
  }

  /** Handle an incoming ICE candidate from the peer. */
  async handleIceCandidate(candidate: any): Promise<void> {
    if (!this.pc) return;

    if (!this.remoteDescSet) {
      // Buffer until remote description is set
      this.iceCandidateBuffer.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('[webrtc] addIceCandidate error:', e);
    }
  }

  /** Mute/unmute local audio. */
  toggleMute(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  /** Enable/disable local video. */
  toggleVideo(enabled: boolean): void {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  /** Switch between front/back camera. */
  async switchCamera(): Promise<void> {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (videoTrack && (videoTrack as any)._switchCamera) {
      (videoTrack as any)._switchCamera();
    }
  }

  /** Get local stream for previewing camera/mic. */
  get local(): MediaStream | null {
    return this.localStream;
  }

  /** End the call and clean up. */
  endCall(): void {
    if (this.remotePubKey && this.myPubKey) {
      signalingClient.send({
        type: 'call-end',
        from: this.myPubKey,
        to: this.remotePubKey,
      });
    }
    this._cleanup();
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private async _createPeerConnection(): Promise<void> {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // ICE candidates → send to peer via signaling
    this.pc.onicecandidate = (event: any) => {
      if (event.candidate && this.remotePubKey && this.myPubKey) {
        signalingClient.send({
          type: 'ice-candidate',
          from: this.myPubKey,
          to: this.remotePubKey,
          data: event.candidate,
        });
      }
    };

    // Remote track arrived
    this.pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        this.callbacks?.onRemoteStream(event.streams[0]);
      }
    };

    // Connection state changes
    this.pc.onconnectionstatechange = () => {
      const state = (this.pc as any)?.connectionState ?? 'unknown';
      console.log('[webrtc] connection state:', state);
      this.callbacks?.onConnectionStateChange?.(state);

      if (state === 'failed' || state === 'disconnected') {
        this.callbacks?.onError('Call connection lost');
        this._cleanup();
      }
      if (state === 'closed') {
        this.callbacks?.onCallEnded();
      }
    };
  }

  private async _addLocalStream(): Promise<void> {
    try {
      this.localStream = await mediaDevices.getUserMedia({
        audio: true,
        video:
          this.callType === 'video'
            ? { facingMode: 'user', width: 640, height: 480, frameRate: 30 }
            : false,
      });

      this.localStream.getTracks().forEach((track) => {
        this.pc?.addTrack(track, this.localStream!);
      });
    } catch (e: any) {
      const msg =
        e.message?.includes('permission')
          ? 'Microphone/camera permission denied'
          : `Could not access media: ${e.message}`;
      throw new Error(msg);
    }
  }

  private async _createAndSendOffer(): Promise<void> {
    const offer = await this.pc!.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.callType === 'video',
    } as any);
    await this.pc!.setLocalDescription(offer);

    signalingClient.send({
      type: 'call-offer',
      from: this.myPubKey!,
      to: this.remotePubKey!,
      data: { sdp: offer.sdp, callType: this.callType },
    });
  }

  private async _flushIceCandidates(): Promise<void> {
    while (this.iceCandidateBuffer.length > 0) {
      const c = this.iceCandidateBuffer.shift();
      try {
        await this.pc!.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn('[webrtc] buffered candidate error:', e);
      }
    }
  }

  private _cleanup(): void {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
    this.remotePubKey = null;
    this.remoteDescSet = false;
    this.iceCandidateBuffer = [];
    this.callbacks = null;
  }
}

// Singleton WebRTC manager
export const webrtcManager = new TamizhiWebRTC();
