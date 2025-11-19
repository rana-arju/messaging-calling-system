function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 2147483647 || 1;
}

export function stringToAgoraUid(userId: string): number {
  return hashStringToNumber(userId);
}

export function sanitizeChannelName(channelName: string): string {
  const maxLength = 64;
  let sanitized = channelName
    .replace(/[^a-zA-Z0-9 !#$%&()+\-:;<=>?@\[\]^_{|}~,]/g, '')
    .substring(0, maxLength);
  
  if (!sanitized) {
    sanitized = 'channel';
  }
  
  return sanitized;
}

export function getFullFileUrl(fileUrl?: string | null): string | undefined {
  if (!fileUrl) return undefined;

  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }

  const backendUrl = 'http://localhost:6007';
  return `${backendUrl}${fileUrl}`;
}

export function processMessage(message: any) {
  if (!message) return message;

  let processedMessage = {
    ...message,
    fileUrl: getFullFileUrl(message.fileUrl),
    attachments:
      message.attachments?.map((att: any) => ({
        ...att,
        fileUrl: getFullFileUrl(att.fileUrl),
      })) || [],
  };

  if (!processedMessage.fileUrl && processedMessage.attachments?.length > 0) {
    processedMessage.fileUrl = processedMessage.attachments[0].fileUrl;
    processedMessage.fileName = processedMessage.attachments[0].fileName;
  }

  return processedMessage;
}
