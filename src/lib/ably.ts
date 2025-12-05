import Ably from 'ably';

if (!process.env.ABLY_API_KEY) {
  console.warn('ABLY_API_KEY is not defined');
}

const ably = new Ably.Rest(process.env.ABLY_API_KEY || 'dummy:key');

export const publishUpdate = async (userId: string, data: any) => {
  const channel = ably.channels.get(`user:${userId}`);
  await channel.publish('update', data);
};

export default ably;
