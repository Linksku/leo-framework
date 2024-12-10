let broadcastChannel: BroadcastChannel | null = null;

export default function getFcmBroadcastChannel() {
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel('fcm');
  }
  return broadcastChannel;
}
