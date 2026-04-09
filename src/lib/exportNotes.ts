// Export generated notes to text file for desktop transfer
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface NoteExport {
  patientName?: string;
  mrn?: string;
  noteType: string;
  dateGenerated: string;
  transcript: string;
  generatedNote: string;
}

async function shareFile(filename: string, content: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: filename,
      url: written.uri,
      dialogTitle: 'Save file',
    });
  } else {
    const mimeType = filename.endsWith('.json') ? 'application/json' : 'text/plain;charset=utf-8';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export async function exportNoteToText(note: NoteExport): Promise<void> {
  const timestamp = new Date().toLocaleString();
  const filename = `clinical-note-${note.patientName?.replace(/\s+/g, '-') || 'unknown'}-${new Date().toISOString().split('T')[0]}.txt`;

  const content = `
================================================================================
                           CLINICAL NOTE EXPORT
================================================================================

Patient: ${note.patientName || 'N/A'}
MRN: ${note.mrn || 'N/A'}
Note Type: ${note.noteType}
Date Generated: ${note.dateGenerated}
Exported: ${timestamp}

================================================================================
                              TRANSCRIPT
================================================================================

${note.transcript || 'No transcript available'}

================================================================================
                            GENERATED NOTE
================================================================================

${note.generatedNote}

================================================================================
                        END OF CLINICAL NOTE
================================================================================
`.trim();

  await shareFile(filename, content);
}

export async function exportNoteToJSON(note: NoteExport): Promise<void> {
  const filename = `clinical-note-${note.patientName?.replace(/\s+/g, '-') || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;

  const data = {
    ...note,
    exportedAt: new Date().toISOString(),
  };

  await shareFile(filename, JSON.stringify(data, null, 2));
}

export function copyNoteToClipboard(note: NoteExport): Promise<void> {
  const content = `
CLINICAL NOTE - ${note.noteType}
Patient: ${note.patientName || 'N/A'} | MRN: ${note.mrn || 'N/A'}
Date: ${note.dateGenerated}

${note.generatedNote}
`.trim();

  return navigator.clipboard.writeText(content);
}
