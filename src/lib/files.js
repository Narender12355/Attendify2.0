import { Capacitor } from '@capacitor/core';

/** Saves a jsPDF document: normal download on the web, share sheet inside the Android app. */
export async function savePdf(doc, filename) {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const base64 = doc.output('datauristring').split(',')[1];
    const res = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
    await Share.share({ title: filename, url: res.uri, dialogTitle: 'Save or share your report' });
    return;
  }
  doc.save(filename);
}
