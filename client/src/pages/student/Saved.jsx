import { Link } from 'react-router-dom';
import ListingCard from '../../components/ListingCard';
import { Empty, ErrorBanner, PageHeader } from '../../components/ui';
import { useBookmarks } from '../../lib/useBookmarks';

export default function Saved() {
  const { items, ids, toggle, error } = useBookmarks();
  const listings = items.map((b) => b.listingId).filter((l) => l && typeof l === 'object');
  return (
    <section>
      <PageHeader title="Saved internships" subtitle={`${listings.length} of 100 saved`} />
      <ErrorBanner error={error} />
      {!listings.length && <Empty>Nothing saved yet. Use the bookmark icon on any <Link to="/listings">internship</Link>.</Empty>}
      <div className="cards">
        {listings.map((l) => (
          <ListingCard key={l._id} listing={l} bookmarked={ids.has(l._id)} onToggleBookmark={toggle} />
        ))}
      </div>
    </section>
  );
}
