import { useState } from 'react';
import './App.css';

function App() {
  const [banList, setBanList] = useState([]);
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]); // For stretch feature

  async function getNewItem() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://api.unsplash.com/photos/random', {
        headers: {
          'Authorization': 'Client-ID Yl7TYe4pw2QEXLYp4JoJgbhYI6mh9D2FX6jfKum7dIw'
        }
      }); 

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if any attributes are banned
      if (isItemBanned(data)) {
        // Try again if item is banned
        getNewItem();
        return;
      }

      setItem(data);
      // Add to history (stretch feature)
      setHistory(prev => [...prev, data]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch image. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function isItemBanned(item) {
    return banList.some(bannedItem => {
      return (
        (item?.description?.toLowerCase().includes(bannedItem.value.toLowerCase()) && bannedItem.type === 'description') ||
        (item?.user?.name?.toLowerCase() === bannedItem.value.toLowerCase() && bannedItem.type === 'photographer') ||
        (item?.location?.title?.toLowerCase() === bannedItem.value.toLowerCase() && bannedItem.type === 'location')
      );
    });
  }

  function toggleBanAttribute(value, type) {
    if (!value) return;
    
    const banItem = { value, type };
    const existingBan = banList.find(item => 
      item.value.toLowerCase() === value.toLowerCase() && item.type === type
    );

    if (existingBan) {
      // Remove from ban list if clicked again
      setBanList(prev => prev.filter(item => 
        !(item.value.toLowerCase() === value.toLowerCase() && item.type === type)
      ));
    } else {
      // Add to ban list
      setBanList(prev => [...prev, banItem]);
    }
  }

  function renderClickableAttribute(value, type, label) {
    if (!value) return null;
    
    const isBanned = banList.some(item => 
      item.value.toLowerCase() === value.toLowerCase() && item.type === type
    );

    return (
      <p className="clickable-attribute">
        <strong>{label}:</strong>
        <span 
          onClick={() => toggleBanAttribute(value, type)}
          className={`attribute ${isBanned ? 'banned' : ''}`}
          title={isBanned ? 'Click to unban' : 'Click to ban'}
        >
          {value}
        </span>
      </p>
    );
  }

  function renderItem() {
    if (loading) {
      return <p>Loading...</p>;
    }

    if (error) {
      return <p className="error">{error}</p>;
    }

    if (!item) {
      return <p>Click the button to discover something new!</p>;
    }

    return (
      <div className="item-container">
        {item.urls?.regular && (
          <img 
            src={item.urls.regular} 
            alt={item.description || 'Random image'} 
            className="item-image"
          />
        )}
        <div className="item-details">
          {renderClickableAttribute(item.description, 'description', 'Description')}
          {renderClickableAttribute(item.user?.name, 'photographer', 'Photographer')}
          {renderClickableAttribute(item.location?.title, 'location', 'Location')}
        </div>
      </div>
    );
  }

  function renderBanList() {
    if (banList.length === 0) {
      return <p>No banned items yet</p>;
    }

    return (
      <ul>
        {banList.map((item, index) => (
          <li 
            key={index}
            onClick={() => toggleBanAttribute(item.value, item.type)}
            className="ban-list-item"
          >
            <span className="ban-type">{item.type}:</span> {item.value}
          </li>
        ))}
      </ul>
    );
  }

  function renderHistory() {
    if (history.length === 0) return null;

    return (
      <div className="history-section">
        <h2>History</h2>
        <div className="history-grid">
          {history.map((historyItem, index) => (
            <div key={index} className="history-item">
              <img 
                src={historyItem.urls.thumb} 
                alt={historyItem.description || 'Historical image'} 
              />
              <p>{historyItem.description || 'No description'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Discover Something New!</h1>

      <div className="content">
        {renderItem()}
        <button 
          onClick={getNewItem} 
          className="discover-button"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Discover'}
        </button>
      </div>

      <div className="ban-list">
        <h2>Ban List</h2>
        {renderBanList()}
      </div>

      {renderHistory()}
    </div>
  );
}

export default App;

