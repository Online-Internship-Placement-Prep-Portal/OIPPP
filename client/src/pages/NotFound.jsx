import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="card narrow center">
      <h1>Page not found</h1>
      <p className="muted">The page you asked for does not exist.</p>
      <Link className="btn btn-primary" to="/">Go home</Link>
    </section>
  );
}
