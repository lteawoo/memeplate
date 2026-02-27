export const handoffDownloadToBrowser = (downloadUrl: string) => {
  const link = document.createElement('a');
  link.href = downloadUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
};
