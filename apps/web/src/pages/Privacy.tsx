export function PrivacyPolicy() {
  return (
    <main className="max-w-2xl mx-auto p-4 prose prose-slate">
      <h1>Privacy policy</h1>
      <p>
        HSC Crackers stores the data you give us — your study sessions, syllabus
        progress, upcoming tasks, and account profile — in our Firestore database.
        We use this data solely to provide the app to you.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Profile: name, email, photo, college, batch, medium.</li>
        <li>Study sessions (durations, chapters you tagged).</li>
        <li>Syllabus marks and spaced-repetition tasks.</li>
        <li>FCM tokens for notifications (only if you opt in).</li>
      </ul>
      <h2>How to delete your data</h2>
      <p>
        Open Settings → "Delete my account". This permanently deletes all your
        data and your Firebase Auth account within 24 hours.
      </p>
      <h2>বাংলা সারসংক্ষেপ</h2>
      <p>
        আমরা শুধুমাত্র অ্যাপ পরিচালনার জন্য আপনার তথ্য সংরক্ষণ করি। Settings →
        "আমার অ্যাকাউন্ট মুছে ফেলুন" থেকে আপনার সমস্ত তথ্য মুছে ফেলতে পারেন।
      </p>
    </main>
  );
}