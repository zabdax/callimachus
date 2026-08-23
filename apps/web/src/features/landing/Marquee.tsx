/** Real chapter names from the Bangla-medium syllabus seed — decorative, not content. */
const CHAPTERS = [
  'ভৌত জগত ও পরিমাপ',
  'স্কেলার ও ভেক্টর',
  'গতি',
  'নিউটনের গতিসূত্র',
  'কাজ, ক্ষমতা ও শক্তি',
  'মহাকর্ষ ও অভিকর্ষ',
  'পদার্থের গাঠনিক ধর্ম',
  'পর্যায়বৃত্ত গতি',
  'তরঙ্গ',
  'আলোকবিজ্ঞান',
];

export function Marquee() {
  // Duplicated once so the -50% translate loops seamlessly.
  const items = [...CHAPTERS, ...CHAPTERS];
  return (
    <div className="lpg-marquee" role="presentation" aria-hidden="true">
      <div className="lpg-marquee__track">
        {items.map((name, index) => (
          <span key={index}>{name}</span>
        ))}
      </div>
    </div>
  );
}
