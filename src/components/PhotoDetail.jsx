import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './PhotoDetail.css';
import { useState } from 'react';

function PhotoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const photo = JSON.parse(localStorage.getItem('currentPhoto'));
  // Add state for visualization toggles
  const [visibleCharts, setVisibleCharts] = useState({
    downloads: true,
    engagement: true
  });

  const handleBackToHome = (e) => {
    e.preventDefault();
    // Use navigate without replace to preserve the state
    navigate('/');
  };

  if (!photo) {
    return (
      <div className="photo-detail">
        <div className="detail-header">
          <button onClick={handleBackToHome} className="home-button">← Back to Home</button>
          <div className="error">Photo not found</div>
        </div>
      </div>
    );
  }

  // Enhanced data preparation
  const downloadData = [
    { name: 'Last Week', downloads: photo.downloads || 0 },
    { name: 'Current', downloads: (photo.downloads || 0) * 1.1 }
  ];

  const engagementData = [
    { name: 'This Photo', likes: photo.likes, views: photo.views || 0 },
    { name: 'Average', likes: 100, views: 1000 }
  ];

  // Calculate engagement rate
  const engagementRate = ((photo.likes || 0) / (photo.views || 1) * 100).toFixed(2);
  
  // Determine photo performance metrics
  const performanceMetrics = {
    engagement: engagementRate > 5 ? 'High' : engagementRate > 2 ? 'Average' : 'Low',
    composition: photo.width > photo.height ? 'Landscape' : 'Portrait',
    popularity: photo.likes > 100 ? 'Trending' : 'Growing'
  };

  // Generate insights
  const generateInsights = () => {
    const insights = [];
    
    if (photo.likes > 100) {
      insights.push("This photo is performing well in terms of engagement!");
    }
    
    if (photo.downloads > 50) {
      insights.push("High download rate indicates strong commercial appeal.");
    }

    if (photo.tags && photo.tags.length > 5) {
      insights.push("Well-tagged photo improves discoverability.");
    }

    return insights;
  };

  // Suggested filters based on photo attributes
  const suggestedFilters = () => {
    return [
      {
        type: 'Orientation',
        value: photo.width > photo.height ? 'Landscape' : 'Portrait',
        why: 'Find similar composition styles'
      },
      {
        type: 'Likes Range',
        value: `${Math.floor(photo.likes * 0.8)} - ${Math.ceil(photo.likes * 1.2)}`,
        why: 'Discover similarly popular photos'
      },
      photo.location?.title && {
        type: 'Location',
        value: photo.location.title,
        why: 'Explore more from this location'
      }
    ].filter(Boolean);
  };

  return (
    <div className="photo-detail">
      <div className="detail-header">
        <button onClick={handleBackToHome} className="home-button">← Back to Home</button>
        <h2>{photo.description || 'Untitled Photo'}</h2>
        <span className="detail-date">{new Date(photo.created_at).toLocaleDateString()}</span>
      </div>

      <div className="detail-content">
        <div className="detail-image">
          <img src={photo.urls.regular} alt={photo.description} />
        </div>

        <div className="detail-info">
          {/* Photographer Info with Enhanced Stats */}
          <section className="photographer-info">
            <h3>Photographer Profile</h3>
            <div className="photographer-header">
              <img src={photo.user.profile_image.medium} alt={photo.user.name} className="photographer-avatar" />
              <div className="photographer-details">
                <h4>{photo.user.name}</h4>
                <p className="photographer-bio">{photo.user.bio}</p>
                <div className="photographer-stats">
                  <span>Total Photos: {photo.user.total_photos || 'N/A'}</span>
                  <span>Total Collections: {photo.user.total_collections || 'N/A'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Enhanced Analytics Dashboard */}
          <section className="analytics-dashboard">
            <h3>Photo Analytics</h3>
            <div className="performance-metrics">
              <div className="metric-card">
                <h4>Engagement Rate</h4>
                <p className={`metric-value ${performanceMetrics.engagement.toLowerCase()}`}>
                  {engagementRate}%
                </p>
                <span className="metric-label">{performanceMetrics.engagement} Engagement</span>
              </div>
              <div className="metric-card">
                <h4>Downloads</h4>
                <p className="metric-value">{photo.downloads || 0}</p>
                <span className="metric-label">Total Downloads</span>
              </div>
              <div className="metric-card">
                <h4>Popularity</h4>
                <p className="metric-value">{performanceMetrics.popularity}</p>
                <span className="metric-label">Current Status</span>
              </div>
            </div>

            {/* Insights Section */}
            <div className="insights-section">
              <h4>Key Insights</h4>
              <ul className="insights-list">
                {generateInsights().map((insight, index) => (
                  <li key={index} className="insight-item">{insight}</li>
                ))}
              </ul>
            </div>

            {/* Filter Suggestions */}
            <div className="filter-suggestions">
              <h4>Suggested Filters</h4>
              <div className="suggested-filters-list">
                {suggestedFilters().map((filter, index) => (
                  <div key={index} className="filter-suggestion-card">
                    <h5>{filter.type}</h5>
                    <p className="filter-value">{filter.value}</p>
                    <small className="filter-reason">{filter.why}</small>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced Charts with Toggle Controls */}
            <div className="stat-charts">
              <div className="chart-controls">
                <button 
                  onClick={() => setVisibleCharts(prev => ({ ...prev, downloads: !prev.downloads }))}
                  className={`chart-toggle ${visibleCharts.downloads ? 'active' : ''}`}
                >
                  {visibleCharts.downloads ? 'Hide' : 'Show'} Download Trend
                </button>
                <button 
                  onClick={() => setVisibleCharts(prev => ({ ...prev, engagement: !prev.engagement }))}
                  className={`chart-toggle ${visibleCharts.engagement ? 'active' : ''}`}
                >
                  {visibleCharts.engagement ? 'Hide' : 'Show'} Engagement Data
                </button>
              </div>

              {visibleCharts.downloads && (
                <div className="chart">
                  <h4>Download Trend</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={downloadData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="downloads" stroke="#8884d8" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {visibleCharts.engagement && (
                <div className="chart">
                  <h4>Engagement Comparison</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="likes" fill="#8884d8" />
                      <Bar dataKey="views" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>

          {/* Technical Details with Visual Indicators */}
          <section className="technical-info">
            <h3>Technical Details</h3>
            <div className="technical-grid">
              <div className="tech-item">
                <span className="tech-label">Resolution</span>
                <span className="tech-value">{photo.width} × {photo.height}</span>
              </div>
              <div className="tech-item">
                <span className="tech-label">Aspect Ratio</span>
                <span className="tech-value">{(photo.width / photo.height).toFixed(2)}</span>
              </div>
              <div className="tech-item">
                <span className="tech-label">Color Profile</span>
                <span className="tech-value">{photo.color || 'Standard'}</span>
              </div>
              <div className="tech-item">
                <span className="tech-label">Location</span>
                <span className="tech-value">{photo.location?.title || 'Not specified'}</span>
              </div>
            </div>
          </section>

          {/* Enhanced Tags Section */}
          <section className="tags">
            <h3>Tags & Categories</h3>
            <div className="tag-list">
              {photo.tags?.map(tag => (
                <span key={tag.title} className="tag">
                  {tag.title}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default PhotoDetail;







