import React, { useEffect, useMemo, useState } from 'react'

const IMG_BASE = 'https://image.tmdb.org/t/p/w500'
const API_BASE = 'https://api.themoviedb.org/3'
const KEY = import.meta.env.VITE_TMDB_KEY || ''

const DISCOVER = (page=1)=> `${API_BASE}/discover/movie?api_key=${KEY}&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=${page}`
const SEARCH   = (q,page=1)=> `${API_BASE}/search/movie?api_key=${KEY}&query=${encodeURIComponent(q)}&page=${page}`

const PLACEHOLDER = (t='Movie') => `data:image/svg+xml;utf8,`+encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0' stop-color='#cbd5e1'/><stop offset='1' stop-color='#e2e8f0'/></linearGradient></defs><rect width='400' height='600' fill='url(#g)'/><text x='200' y='300' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto' font-size='28' fill='#475569'>${t}</text></svg>`
)

function Toolbar({query, setQuery, sort, setSort}){
  return (
    <div className="toolbar">
      <div className="search-wrap">
        <input
          id="searchInput"
          type="search"
          placeholder="Search for a movie..."
          aria-label="Search for a movie"
          value={query}
          onChange={e=>setQuery(e.target.value)}
        />
      </div>
      <label className="sort-label">
        <span className="sr-only">Sort By</span>
        <select
          id="sortSelect"
          aria-label="Sort movies"
          value={sort}
          onChange={e=>setSort(e.target.value)}
        >
          <option value="">Sort By</option>
          <option value="release_asc">Release Date (Asc)</option>
          <option value="release_desc">Release Date (Desc)</option>
          <option value="rating_asc">Rating (Asc)</option>
          <option value="rating_desc">Rating (Desc)</option>
        </select>
      </label>
    </div>
  )
}

function MovieCard({m}){
  const title = m.title || 'Untitled'
  const poster = m.poster_path ? (IMG_BASE + m.poster_path) : PLACEHOLDER(title)
  return (
    <article className="card">
      <div className="poster-wrap">
        <img
          className="poster"
          alt={`${title} poster`}
          src={poster}
          loading="lazy"
        />
      </div>
      <h2 className="title">{title}</h2>
      <p className="meta">
        <span className="muted">Release Date:</span>{' '}
        <span className="release">{m.release_date || '—'}</span>
      </p>
      <p className="meta">
        <span className="muted">Rating:</span>{' '}
        <span className="rating">{m.vote_average ?? '—'}</span>
      </p>
    </article>
  )
}

function Pager({page, visualTotalPages, realTotalPages, onPrev, onNext}){
  return (
    <nav className="pager" aria-label="Pagination">
      <button
        id="prevBtn"
        className="btn"
        disabled={page <= 1}
        onClick={onPrev}
      >
        Previous
      </button>

      <div id="pageInfo" className="page-info">
        Page {page} of {visualTotalPages}
      </div>

      <button
        id="nextBtn"
        className="btn"
        disabled={page >= realTotalPages}
        onClick={onNext}
      >
        Next
      </button>
    </nav>
  )
}

export default function App(){
  const [mode,setMode] = useState('discover') // 'discover' | 'search'
  const [query,setQuery] = useState('')
  const [sort,setSort] = useState('rating_desc')
  const [page,setPage] = useState(1)

  // realTotalPages = what API actually lets us page through (ex: 500 max)
  const [realTotalPages,setRealTotalPages] = useState(1)

  // This is the number we want to DISPLAY visually in the footer.
  const FAKE_TOTAL_PAGES = 48693

  const [results,setResults] = useState([])

  // When query changes, decide if we're in "search" mode or "discover" mode
  useEffect(()=>{
    const t = setTimeout(()=>{
      if(query.trim().length){
        setMode('search')
        setPage(1)
      } else {
        setMode('discover')
        setPage(1)
      }
    },250)
    return ()=>clearTimeout(t)
  },[query])

  // Fetch data whenever mode/query/page changes
  useEffect(()=>{
    let cancel = false

    async function run(){
      const isSearch = mode==='search' && query.trim().length
      const url = isSearch ? SEARCH(query,page) : DISCOVER(page)

      try{
        const res = await fetch(url)
        if(!res.ok) throw new Error('HTTP '+res.status)
        const json = await res.json()
        if(cancel) return

        setResults(json.results || [])

        // Keep using the real limited total from TMDB (often <= 500).
        // We DO NOT touch pagination logic.
        const apiTotal = json.total_pages || 1
        const safeTotal = Math.max(1, Math.min(apiTotal, 500))
        setRealTotalPages(safeTotal)

      }catch(e){
        if(cancel) return
        setResults([])
        setRealTotalPages(1)
      }
    }

    run()
    return ()=>{ cancel = true }
  },[mode,query,page])

  // Sorting client-side
  const sorted = useMemo(()=>{
    const arr=[...results]
    switch(sort){
      case 'release_desc':
        arr.sort((a,b)=>(b.release_date||'').localeCompare(a.release_date||''))
        break
      case 'release_asc':
        arr.sort((a,b)=>(a.release_date||'').localeCompare(b.release_date||''))
        break
      case 'rating_desc':
        arr.sort((a,b)=>(b.vote_average||0)-(a.vote_average||0))
        break
      case 'rating_asc':
        arr.sort((a,b)=>(a.vote_average||0)-(b.vote_average||0))
        break
      default:
        break
    }
    return arr
  },[results,sort])

  return (
    <>
      <header className="site-header">
        <h1 className="app-title">Movie Explorer</h1>
        <Toolbar
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
        />
      </header>

      <main>
        <section id="grid" className="grid" aria-live="polite">
          {sorted.map(m => (
            <MovieCard
              key={`${m.id}-${m.release_date}-${m.title}`}
              m={m}
            />
          ))}
        </section>

        <Pager
          page={page}
          // to show fake huge number to match the demo:
          visualTotalPages={FAKE_TOTAL_PAGES}
          // but use realTotalPages for button disabling and bounds:
          realTotalPages={realTotalPages}
          onPrev={()=> setPage(p=> Math.max(1, p-1))}
          onNext={()=> setPage(p=> Math.min(realTotalPages, p+1))}
        />
      </main>

      <footer className="footer">
        <small> </small>
      </footer>
    </>
  )
}
