import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import ListingCard from '../../components/ListingCard';
import { Empty, ErrorBanner, Loading, PageHeader } from '../../components/ui';
import { useApi } from '../../lib/useApi';
import { useBookmarks } from '../../lib/useBookmarks';
import { formatDate, formatINR } from '../../lib/format';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const recs = useApi('/listings/recommendations');
  const weekParams = useMemo(() => {
    const now = new Date();
    return { deadlineAfter: now.toISOString(), deadlineBefore: new Date(now.getTime() + 7 * 86400000).toISOString(),
      sortBy: 'deadline', order: 'asc', limit: 10 };
  }, []);
  const week = useApi('/listings', weekParams);
  const bookmarks = useBookmarks();

  function onSearch(e) {
    e.preventDefault();
    navigate(query.trim() ? `/listings?search=${encodeURIComponent(query.trim())}` : '/listings');
  }

  const top = (recs.data?.listings || []).slice(0, 10);

  return (
    <section>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Internships picked for your skills." />
      <form className="searchbar" role="search" onSubmit={onSearch}>
        <label htmlFor="home-search" className="sr-only">Search internships</label>
        <input id="home-search" type="search" placeholder="Search by title, company or skill"
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn btn-primary" type="submit">Search</button>
      </form>

      <div className="home-grid">
        <div>
          <h2>Recommended for you</h2>
          <ErrorBanner error={recs.error || bookmarks.error} onRetry={recs.error ? recs.reload : undefined} />
          {recs.loading && <Loading />}
          {!recs.loading && !top.length && !recs.error && (
            <Empty>
              No matches yet. Add skills and your CGPA on your <Link to="/profile">profile</Link> to get recommendations.
            </Empty>
          )}
          <div className="cards">
            {top.map((l) => (
              <ListingCard key={l._id} listing={l} matched={l.matchedSkills}
                bookmarked={bookmarks.ids.has(l._id)} onToggleBookmark={bookmarks.toggle} />
            ))}
          </div>
        </div>
        <aside className="card side">
          <h2>Deadlines this week</h2>
          {week.loading && <Loading />}
          <ErrorBanner error={week.error} />
          {!week.loading && !week.data?.listings?.length && <Empty>Nothing closes in the next 7 days.</Empty>}
          <ul className="deadline-list">
            {week.data?.listings?.map((l) => (
              <li key={l._id}>
                <Link to={`/listings/${l._id}`} state={{ listing: l }}>{l.title}</Link>
                <span className="muted small">{l.company} · {formatINR(l.stipend)}</span>
                <span className="small">Closes {formatDate(l.deadline)}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
