import { supabase } from './supabase';

interface PeerConnection {
  connection: RTCPeerConnection;
  stream: MediaStream;
  makingOffer: boolean;
  ignoreOffer: boolean;
  polite: boolean;
}

class WebRTCManager {
  private connections: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private userId: string;
  private onStreamCallback: (userId: string, stream: MediaStream) => void;

  constructor(
    userId: string,
    onStream: (userId: string, stream: MediaStream) => void
  ) {
    this.userId = userId;
    this.onStreamCallback = onStream;
    this.setupSignaling();
  }

  private async setupSignaling() {
    const channel = supabase.channel('webrtc-signaling');
    
    channel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.target === this.userId) {
          await this.handleSignalingMessage(payload.from, { type: 'offer', sdp: payload.offer.sdp });
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.target === this.userId) {
          await this.handleSignalingMessage(payload.from, { type: 'answer', sdp: payload.answer.sdp });
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.target === this.userId) {
          await this.handleSignalingMessage(payload.from, { 
            type: 'ice-candidate', 
            candidate: payload.candidate 
          });
        }
      })
      .subscribe();
  }

  private async createPeerConnection(targetUserId: string, polite: boolean): Promise<PeerConnection> {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
      iceTransportPolicy: 'all',
    };

    const connection = new RTCPeerConnection(config);
    const peer: PeerConnection = {
      connection,
      stream: new MediaStream(),
      makingOffer: false,
      ignoreOffer: false,
      polite
    };

    connection.onicecandidate = async (event) => {
      if (event.candidate) {
        await supabase.channel('webrtc-signaling').send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: this.userId,
            target: targetUserId,
            candidate: event.candidate,
          },
        });
      }
    };

    connection.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        this.onStreamCallback(targetUserId, stream);
      }
    };

    connection.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        const offer = await connection.createOffer();
        if (connection.signalingState !== 'stable') return;
        await connection.setLocalDescription(offer);
        await supabase.channel('webrtc-signaling').send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            from: this.userId,
            target: targetUserId,
            offer: connection.localDescription,
          },
        });
      } catch (err) {
        console.error('Error during negotiation:', err);
      } finally {
        peer.makingOffer = false;
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (track.kind === 'audio') {
          connection.addTrack(track, this.localStream!);
        }
      });
    }

    return peer;
  }

  private async handleSignalingMessage(fromUserId: string, message: any) {
    let peer = this.connections.get(fromUserId);
    
    if (!peer) {
      if (message.type === 'offer') {
        peer = await this.createPeerConnection(fromUserId, false);
        this.connections.set(fromUserId, peer);
      } else {
        return;
      }
    }

    try {
      const { connection, makingOffer, ignoreOffer, polite } = peer;

      if (message.type === 'offer') {
        const offerCollision = makingOffer || connection.signalingState !== 'stable';
        peer.ignoreOffer = !polite && offerCollision;
        
        if (peer.ignoreOffer) {
          return;
        }

        await connection.setRemoteDescription(message);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        
        await supabase.channel('webrtc-signaling').send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            from: this.userId,
            target: fromUserId,
            answer: connection.localDescription,
          },
        });
      } else if (message.type === 'answer') {
        await connection.setRemoteDescription(message);
      } else if (message.type === 'ice-candidate' && message.candidate) {
        try {
          await connection.addIceCandidate(message.candidate);
        } catch (err) {
          if (!ignoreOffer) {
            console.error('Error adding ICE candidate:', err);
          }
        }
      }
    } catch (err) {
      console.error('Error handling signaling message:', err);
    }
  }

  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    // Add tracks to all existing connections
    this.connections.forEach(peer => {
      stream.getTracks().forEach(track => {
        if (track.kind === 'audio') {
          peer.connection.addTrack(track, stream);
        }
      });
    });
  }

  async connectToUser(targetUserId: string) {
    if (this.connections.has(targetUserId)) return;

    const peer = await this.createPeerConnection(targetUserId, true);
    this.connections.set(targetUserId, peer);
  }

  async connectToAllUsers(userIds: string[]) {
    const otherUsers = userIds.filter(id => id !== this.userId);
    await Promise.all(otherUsers.map(id => this.connectToUser(id)));
  }

  disconnect() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.connections.forEach(peer => {
      peer.connection.close();
    });
    this.connections.clear();
  }
}

export default WebRTCManager;