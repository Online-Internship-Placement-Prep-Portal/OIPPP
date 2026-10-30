import { PageHeader } from '../components/ui';

const SECTIONS = [
  ['Students', [
    'Register with your institutional email and SRN, then fill in your profile and upload a PDF resume (up to 2 MB).',
    'Home shows the internships that best match your skills. Use Internships to search and filter, and the bookmark icon to save one.',
    'You can apply once per internship. Track every application and its history under My Applications.',
    'Aptitude tests are timed by the server. Each answer is saved as you pick it, so a refresh or lost connection does not lose work. You can take each test once.',
    'Progress shows your score trend, your two weakest topics and your application counts.',
  ]],
  ['Recruiters', [
    'After you register, a placement admin must approve your account before you can log in.',
    'Post listings with the skills, minimum CGPA and deadline. Listings close automatically when the deadline passes.',
    'Open a listing to see its applicants, view resumes and move each applicant through the stages. Rejections need a reason.',
  ]],
  ['Placement admins', [
    'Approve or reject recruiter accounts, deactivate accounts and view student resumes.',
    'Build tests from the question bank and publish them. Published tests cannot be edited.',
    'Statistics shows placement numbers per branch and graduation year, and exports them as CSV.',
  ]],
  ['Account and security', [
    'Passwords need at least 8 characters with a letter and a digit.',
    'After 5 wrong passwords in a row the account is locked for 15 minutes.',
    'Sessions last 60 minutes; after that you are asked to log in again.',
  ]],
];

export default function Help() {
  return (
    <section>
      <PageHeader title="Help" subtitle="How the portal works for each role." />
      <div className="grid-2">
        {SECTIONS.map(([title, items]) => (
          <article key={title} className="card">
            <h2>{title}</h2>
            <ul className="list">
              {items.map((text) => <li key={text}>{text}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
