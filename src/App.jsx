import { useState, useEffect } from 'react';
import './App.css';
import backgroundImage from './assets/suitcase_bg.png';
import { Route, Routes, Link } from 'react-router-dom';
import PhotoDetail from './components/PhotoDetail';

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    likes: { min: 0, max: Infinity },
    photographer: '',
    orientation: 'all',
    dateRange: 'all',
    category: [],  // Allow multiple categories
    dimensions: { 
      width: { min: 0, max: Infinity },
      height: { min: 0, max: Infinity }
    }
  });
  const [stats, setStats] = useState({
    totalItems: 0,
    averageLikes: 0,
    topLocations: [],
    photographerCount: 0
  });
  const [isRefreshDisabled, setIsRefreshDisabled] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [nextRefreshTime, setNextRefreshTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundImage})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    
    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundAttachment = '';
    };
  }, []);

  const HOUR_IN_MS = 3600000;
  const MAX_REQUESTS_PER_HOUR = 50; // Demo app limit

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => {
      if (filterName === 'likes') {
        // Ensure min and max are numbers and max is greater than min
        const newMin = typeof value.min === 'number' ? value.min : 0;
        const newMax = typeof value.max === 'number' ? value.max : Infinity;
        return {
          ...prev,
          likes: {
            min: newMin,
            max: newMax === 0 ? Infinity : newMax // If max is 0, treat as Infinity
          }
        };
      }
      return { ...prev, [filterName]: value };
    });
  };

  useEffect(() => {
    console.log('API Key available:', !!import.meta.env.VITE_UNSPLASH_ACCESS_KEY);
    // Only fetch images if there are none in state
    if (items.length === 0) {
      fetchImages();
    }
  }, []);  // Keep the empty dependency array

  useEffect(() => {
    calculateStats();
  }, [items]);

  useEffect(() => {
    // Reset request count every hour
    const interval = setInterval(() => {
      setRequestCount(0);
    }, HOUR_IN_MS);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!nextRefreshTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, nextRefreshTime - Date.now());
      if (remaining === 0) {
        setNextRefreshTime(null);
        setTimeRemaining(null);
        setIsRefreshDisabled(false);
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextRefreshTime]);

  useEffect(() => {
    const storedRefreshTime = localStorage.getItem('nextRefreshTime');
    if (storedRefreshTime) {
      const refreshTime = parseInt(storedRefreshTime);
      if (Date.now() < refreshTime) {
        setNextRefreshTime(refreshTime);
        setIsRefreshDisabled(true);
      } else {
        localStorage.removeItem('nextRefreshTime');
      }
    }
  }, []);

  const RATE_LIMIT_DELAY = 1000; // 1 second between requests

  async function fetchImages() {
    setLoading(true);
    setError(null);
    
    try {
      const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
      
      if (!ACCESS_KEY) {
        throw new Error('API key not found. Please check your environment variables.');
      }

      // Add tags_preview to the fields and update topics to match our categories
      const response = await fetch(
        'https://api.unsplash.com/photos/random?count=10' + 
        '&topics=travel,nature,architecture' +
        '&content_filter=high' +
        '&fields=id,description,alt_description,urls,user,location,likes,downloads,created_at,width,height,tags,tags_preview',
        {
          headers: {
            'Authorization': `Client-ID ${ACCESS_KEY}`,
            'Accept-Version': 'v1'
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 403) {
          const refreshTime = Date.now() + 3600000; // 1 hour
          setNextRefreshTime(refreshTime);
          localStorage.setItem('nextRefreshTime', refreshTime.toString());
          throw new Error('Rate limit exceeded. Please try again in 1 hour.');
        } else if (response.status === 401) {
          throw new Error('Invalid API key. Please check your Unsplash access key.');
        }
        throw new Error(`API error: ${response.status}`);
      }
      
      const results = await response.json();
      
      // Transform results with improved location handling
      const transformedResults = results.map(item => ({
        ...item,
        description: item.description || item.alt_description || "A beautiful photograph",
        location: {
          ...item.location,
          // Create a searchable location string that includes all location data
          searchableLocation: [
            item.location?.title,
            item.location?.name,
            item.location?.city,
            item.location?.state,
            item.location?.country
          ].filter(Boolean).join(' ').toLowerCase(),
          // Keep a display title for showing in the UI
          title: item.location?.title || 
                 item.location?.name || 
                 [item.location?.city, item.location?.state, item.location?.country]
                   .filter(Boolean)
                   .join(', ') || 
                 "Location not specified"
        }
      }));

      setItems(transformedResults);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch images. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function calculateStats() {
    if (!items.length) return;

    // Basic statistics
    const totalLikes = items.reduce((sum, item) => sum + (item.likes || 0), 0);
    const averageLikes = Math.round(totalLikes / items.length);
    
    // Get sorted likes array for percentile calculations
    const sortedLikes = items.map(item => item.likes).sort((a, b) => a - b);
    const medianLikes = sortedLikes[Math.floor(sortedLikes.length / 2)];
    
    // Calculate quartiles for likes
    const q1Likes = sortedLikes[Math.floor(sortedLikes.length * 0.25)];
    const q3Likes = sortedLikes[Math.floor(sortedLikes.length * 0.75)];
    
    // Calculate dimensions statistics
    const aspectRatios = items.map(item => item.width / item.height);
    const averageAspectRatio = aspectRatios.reduce((sum, ratio) => sum + ratio, 0) / items.length;
    
    // Location statistics
    const locations = items
      .map(item => item.location?.title)
      .filter(Boolean)
      .reduce((acc, loc) => {
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      }, {});

    const topLocations = Object.entries(locations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([loc]) => loc);

    // Photographer statistics
    const photographers = new Set(items.map(item => item.user?.username)).size;
    
    // Download statistics
    const totalDownloads = items.reduce((sum, item) => sum + (item.downloads || 0), 0);
    const averageDownloads = Math.round(totalDownloads / items.length);

    setStats({
      // Collection stats
      totalItems: items.length,
      photographerCount: photographers,
      uniqueLocations: Object.keys(locations).length,
      
      // Likes stats
      averageLikes,
      medianLikes,
      q1Likes,
      q3Likes,
      
      // Download stats
      totalDownloads,
      averageDownloads,
      
      // Dimension stats
      averageAspectRatio: averageAspectRatio.toFixed(2),
      landscapeCount: items.filter(item => item.width > item.height).length,
      portraitCount: items.filter(item => item.width < item.height).length,
      
      // Location stats
      topLocations
    });
  }

  function filterItems() {
    return items.filter(item => {
      // Create a searchable text for the search bar
      const searchableText = [
        item.description,
        item.user?.name,
        item.user?.username,
        item.location?.searchableLocation, // Use the new searchableLocation field
        item.user?.bio,
        item.alt_description
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      // Search query matching
      const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
      const matchesSearch = !searchQuery || searchTerms.every(term => searchableText.includes(term));

      // Improved location filter matching
      const locationQuery = filters.location.toLowerCase().trim();
      const matchesLocation = !locationQuery || (
        item.location?.searchableLocation?.includes(locationQuery)
      );

      // Fixed likes filter matching
      const likesCount = item.likes || 0;
      const matchesLikes = likesCount >= (filters.likes.min || 0) && 
                          (filters.likes.max === Infinity || likesCount <= filters.likes.max);

      const matchesPhotographer = !filters.photographer ||
        item.user?.username?.toLowerCase().includes(filters.photographer.toLowerCase());

      const matchesOrientation = filters.orientation === 'all' ||
        (filters.orientation === 'landscape' ? item.width > item.height : item.width < item.height);

      const matchesDimensions = 
        item.width >= filters.dimensions.width.min &&
        (filters.dimensions.width.max === Infinity || item.width <= filters.dimensions.width.max) &&
        item.height >= filters.dimensions.height.min &&
        (filters.dimensions.height.max === Infinity || item.height <= filters.dimensions.height.max);

      const matchesCategories = filters.category.length === 0 || 
        filters.category.some(selectedCategory => 
          (item.categories || []).includes(selectedCategory.toLowerCase()) ||
          (item.tags || []).some(tag => 
            tag.title.toLowerCase() === selectedCategory.toLowerCase()
          )
        );

      return matchesSearch && matchesLocation && matchesLikes && 
             matchesPhotographer && matchesOrientation && 
             matchesDimensions && matchesCategories;
    });
  }

  const handleRefresh = async () => {
    if (nextRefreshTime && Date.now() < nextRefreshTime) {
      return;
    }

    setIsRefreshDisabled(true);
    await fetchImages();
    
    // Set next refresh time to 5 seconds from now
    const refreshTime = Date.now() + 5000; // Changed from 600000 (10 minutes) to 5000 (5 seconds)
    setNextRefreshTime(refreshTime);
    localStorage.setItem('nextRefreshTime', refreshTime.toString());
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Photo Discovery Dashboard</h1>
        
        <div className="stats-container">
          {/* Collection Statistics */}
          <div className="stat-group">
            <h2>Collection Stats</h2>
            <div className="stat-boxes">
              <div className="stat-box">
                <h3>Total Photos</h3>
                <p>{stats.totalItems}</p>
              </div>
              <div className="stat-box">
                <h3>Unique Photographers</h3>
                <p>{stats.photographerCount}</p>
              </div>
              <div className="stat-box">
                <h3>Unique Locations</h3>
                <p>{stats.uniqueLocations}</p>
              </div>
            </div>
          </div>

          {/* Engagement Statistics */}
          <div className="stat-group">
            <h2>Engagement Stats</h2>
            <div className="stat-boxes">
              <div className="stat-box">
                <h3>Likes Distribution</h3>
                <div className="quartile-stats">
                  <small>Q1: {stats.q1Likes}</small>
                  <small>Median: {stats.medianLikes}</small>
                  <small>Q3: {stats.q3Likes}</small>
                </div>
              </div>
              <div className="stat-box">
                <h3>Average Engagement</h3>
                <p>❤️ {stats.averageLikes}</p>
                <p>📥 {stats.averageDownloads}</p>
              </div>
            </div>
          </div>

          {/* Composition Statistics */}
          <div className="stat-group">
            <h2>Composition Stats</h2>
            <div className="stat-boxes">
              <div className="stat-box">
                <h3>Orientation Ratio</h3>
                <div className="orientation-stats">
                  <small>📱 Portrait: {stats.portraitCount}</small>
                  <small>🖥️ Landscape: {stats.landscapeCount}</small>
                </div>
              </div>
              <div className="stat-box">
                <h3>Avg Aspect Ratio</h3>
                <p>{stats.averageAspectRatio}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="search-filters">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search photos by description, photographer, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                className="clear-search"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
            <div className="search-info">
              {filterItems().length} results found
            </div>
          </div>
          
          <div className="filters">
            {/* Text input filter */}
            <div className="filter-group">
              <label htmlFor="location-filter">Location</label>
              <input
                id="location-filter"
                type="text"
                placeholder="Filter by city, state, or country"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="filter-input"
              />
            </div>

            {/* Multiple select filter and Range slider in separate containers */}
            <div className="filters-container">
              <div className="filter-group category-group">
                <label>Categories</label>
                <div className="checkbox-group">
                  {['nature', 'architecture', 'travel', 'landscape', 'portrait'].map(category => (
                    <label key={category} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={filters.category.includes(category)}
                        onChange={(e) => {
                          const newCategories = e.target.checked
                            ? [...filters.category, category]
                            : filters.category.filter(cat => cat !== category);
                          handleFilterChange('category', newCategories);
                        }}
                      />
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-group range-group">
                <label>Likes Range</label>
                <div className="range-inputs">
                  <div className="range-controls">
                    <input
                      type="number"
                      value={filters.likes.min}
                      onChange={(e) => handleFilterChange('likes', { 
                        ...filters.likes, 
                        min: parseInt(e.target.value) || 0 
                      })}
                      placeholder="Min"
                      className="range-input"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={filters.likes.min}
                      onChange={(e) => handleFilterChange('likes', { 
                        ...filters.likes, 
                        min: parseInt(e.target.value) 
                      })}
                      className="range-slider"
                    />
                    <input
                      type="number"
                      value={filters.likes.max === Infinity ? '' : filters.likes.max}
                      onChange={(e) => handleFilterChange('likes', { 
                        ...filters.likes, 
                        max: e.target.value ? parseInt(e.target.value) : Infinity 
                      })}
                      placeholder="Max"
                      className="range-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Radio button filter */}
            <div className="filter-group">
              <label>Orientation</label>
              <div className="radio-group">
                {['all', 'landscape', 'portrait'].map(orientation => (
                  <label key={orientation} className="radio-label">
                    <input
                      type="radio"
                      name="orientation"
                      value={orientation}
                      checked={filters.orientation === orientation}
                      onChange={(e) => handleFilterChange('orientation', e.target.value)}
                    />
                    {orientation.charAt(0).toUpperCase() + orientation.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {/* Dimension filters */}
            <div className="filter-group">
              <label>Dimensions</label>
              <div className="dimension-inputs">
                <div>
                  <label>Width</label>
                  <input
                    type="number"
                    placeholder="Min width"
                    value={filters.dimensions.width.min}
                    onChange={(e) => handleFilterChange('dimensions', {
                      ...filters.dimensions,
                      width: { ...filters.dimensions.width, min: parseInt(e.target.value) || 0 }
                    })}
                    className="dimension-input"
                  />
                  <input
                    type="number"
                    placeholder="Max width"
                    value={filters.dimensions.width.max === Infinity ? '' : filters.dimensions.width.max}
                    onChange={(e) => handleFilterChange('dimensions', {
                      ...filters.dimensions,
                      width: { ...filters.dimensions.width, max: e.target.value ? parseInt(e.target.value) : Infinity }
                    })}
                    className="dimension-input"
                  />
                </div>
                <div>
                  <label>Height</label>
                  <input
                    type="number"
                    placeholder="Min height"
                    value={filters.dimensions.height.min}
                    onChange={(e) => handleFilterChange('dimensions', {
                      ...filters.dimensions,
                      height: { ...filters.dimensions.height, min: parseInt(e.target.value) || 0 }
                    })}
                    className="dimension-input"
                  />
                  <input
                    type="number"
                    placeholder="Max height"
                    value={filters.dimensions.height.max === Infinity ? '' : filters.dimensions.height.max}
                    onChange={(e) => handleFilterChange('dimensions', {
                      ...filters.dimensions,
                      height: { ...filters.dimensions.height, max: e.target.value ? parseInt(e.target.value) : Infinity }
                    })}
                    className="dimension-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Add filter summary */}
          <div className="active-filters">
            {Object.entries(filters).map(([key, value]) => {
              // Handle different types of filter values
              let displayValue = '';
              
              if (key === 'likes') {
                displayValue = `${value.min} - ${value.max === Infinity ? '∞' : value.max}`;
              } else if (key === 'dimensions') {
                const { width, height } = value;
                displayValue = `W: ${width.min}-${width.max === Infinity ? '∞' : width.max}, H: ${height.min}-${height.max === Infinity ? '∞' : height.max}`;
              } else if (Array.isArray(value)) {
                displayValue = value.join(', ');
              } else {
                displayValue = value.toString();
              }

              // Only show non-empty filters
              if (value && value !== 'all' && displayValue !== '') {
                return (
                  <span key={key} className="filter-tag">
                    {key}: {displayValue}
                    <button 
                      onClick={() => {
                        let resetValue;
                        switch (key) {
                          case 'likes':
                            resetValue = { min: 0, max: Infinity };
                            break;
                          case 'dimensions':
                            resetValue = {
                              width: { min: 0, max: Infinity },
                              height: { min: 0, max: Infinity }
                            };
                            break;
                          case 'category':
                            resetValue = [];
                            break;
                          default:
                            resetValue = '';
                        }
                        handleFilterChange(key, resetValue);
                      }}
                      className="remove-filter"
                    >
                      ×
                    </button>
                  </span>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">{error}</div>}

      <div className="photos-list">
        {filterItems().map((item, index) => (
          <Link 
            to={`/photo/${item.id}`} 
            key={item.id || index} 
            className="photo-row"
            onClick={() => localStorage.setItem('currentPhoto', JSON.stringify(item))}
          >
            <div className="photo-preview">
              <img 
                src={item.urls.small} 
                alt={item.description || 'Unsplash photo'} 
                className="photo-thumbnail"
              />
            </div>
            <div className="photo-info">
              <div className="info-column">
                <h3>Photographer</h3>
                <p>{item.user?.name || 'Unknown'}</p>
                <h3>Location</h3>
                <p>{item.location?.title || 
                    (item.location?.city && item.location?.country ? 
                      `${item.location.city}, ${item.location.country}` : 
                      'Location not specified')}</p>
              </div>
              <div className="info-column">
                <h3>Description</h3>
                <p>{item.description || item.alt_description || 'No description available'}</p>
                <h3>Stats</h3>
                <p>❤️ {item.likes || 0} likes • 📥 {item.downloads || 0} downloads</p>
              </div>
              <div className="info-column">
                <h3>Dimensions</h3>
                <p>{item.width}x{item.height}</p>
                <h3>Created</h3>
                <p>{new Date(item.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <button 
        onClick={handleRefresh} 
        className="refresh-button"
        disabled={loading || isRefreshDisabled}
      >
        {isRefreshDisabled 
          ? `Please wait ${timeRemaining || '...'}`
          : 'Refresh Photos'
        }
      </button>
    </div>
  );
}

export default App;



































