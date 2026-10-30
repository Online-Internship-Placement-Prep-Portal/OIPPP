import { Link } from 'react-router-dom';
import { daysUntil, formatDate, formatINR } from '../lib/format';

const MODE_LABELS = { ONSITE: 'On-site', REMOTE: 'Remote', HYBRID: 'Hybrid' };
export const modeLabel = (mode) => MODE_LABELS[mode] || mode;

export default function ListingCard({ listing, bookmarked, onToggleBookmark, matched }) {
  const days = daysUntil(listing.deadline);
  return (
    <article className="card listing-card">
      <div className="listing-top">
        <div>
          <h3><Link to={`/listings/${listing._id}`} state={{ listing }}>{listing.title}</Link></h3>
          <p className="company">{listing.company}</p>
        </div>
        {onToggleBookmark && (
          <button type="button" className={`bookmark${bookmarked ? ' on' : ''}`} aria-pressed={Boolean(bookmarked)}
            aria-label={bookmarked ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
            onClick={() => onToggleBookmark(listing)}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 3h12v18l-6-4-6 4z" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        )}
      </div>
      <ul className="meta">
        <li>{listing.location}</li>
        <li>{modeLabel(listing.mode)}</li>
        <li>{formatINR(listing.stipend)}/month</li>
        {listing.minCgpa != null && <li>CGPA ≥ {listing.minCgpa}</li>}
      </ul>
      <ul className="tags" aria-label="Required skills">
        {listing.skills?.map((s) => (
          <li key={s} className={matched?.includes(s) ? 'tag tag-match' : 'tag'}>{s}</li>
        ))}
      </ul>
      <p className="deadline">
        Apply by {formatDate(listing.deadline)}
        {days >= 0 && days <= 7 && <span className="soon"> · {days === 0 ? 'closes today' : `${days} day${days === 1 ? '' : 's'} left`}</span>}
      </p>
    </article>
  );
}
