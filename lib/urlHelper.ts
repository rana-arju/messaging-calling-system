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
