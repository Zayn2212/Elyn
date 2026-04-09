/**
 * Utility function to copy text to clipboard and show toast feedback.
 */
export const copyToClipboard = async (
  text: string,
  setToast: (message: string) => void
): Promise<void> => {
  await navigator.clipboard.writeText(text);
  setToast('Copied to clipboard!');
  setTimeout(() => setToast(''), 2000);
};

/**
 * Parse a generated clinical note into sections based on common headers.
 */
export const parseNoteSections = (
  note: string
): Array<{ title: string; content: string }> => {
  const sections: Array<{ title: string; content: string }> = [];
  const sectionPatterns = [
    'CHIEF COMPLAINT',
    'HISTORY OF PRESENT ILLNESS',
    'HPI',
    'PAST MEDICAL HISTORY',
    'PMH',
    'MEDICATIONS',
    'ALLERGIES',
    'REVIEW OF SYSTEMS',
    'ROS',
    'PHYSICAL EXAMINATION',
    'EXAM',
    'ASSESSMENT',
    'PLAN',
    'MDM COMPLEXITY',
    'REASON FOR CONSULTATION',
    'RECOMMENDATIONS',
    'SUBJECTIVE',
    'OBJECTIVE',
    'DIAGNOSTIC REVIEW',
    'RISK STRATIFICATION',
  ];

  let currentSection = { title: 'Note', content: '' };

  note.split('\n').forEach((line) => {
    // Strip markdown formatting for header detection
    const cleanLine = line.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim();
    const isHeader = sectionPatterns.some(
      (p) =>
        cleanLine.toUpperCase().includes(p + ':') ||
        cleanLine.toUpperCase() === p
    );

    if (isHeader && currentSection.content.trim()) {
      sections.push(currentSection);
      currentSection = { title: cleanLine.replace(':', '').trim(), content: '' };
    } else if (isHeader) {
      currentSection.title = cleanLine.replace(':', '').trim();
    } else {
      currentSection.content += line + '\n';
    }
  });

  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }

  return sections.length > 0
    ? sections
    : [{ title: 'Clinical Note', content: note }];
};
