import React, { useState, useEffect, useMemo } from 'react';

// Utility functions
const formatNumber = (num) => num.toLocaleString();
const calculateProfit = (price, craftCost) => price - craftCost;
const calculateMargin = (price, craftCost) => {
  if (craftCost === 0) return 0;
  return ((price - craftCost) / craftCost * 100).toFixed(1);
};

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_DATA = [
  {"id":"ek52qp38l","name":"Silver Mold","price":21000,"isCraftable":true,"recipe":[{"itemId":"me6xh8mct","quantity":5},{"itemId":"vrj494aw4","quantity":5},{"itemId":"t7udcw3i2","quantity":10}]},
  {"id":"me6xh8mct","name":"Braided Hemp","price":230,"isCraftable":true,"recipe":[{"itemId":"eui3h7xdj","quantity":5}],"craftPreference":"buy"},
  {"id":"eui3h7xdj","name":"Stem","price":35,"isCraftable":false,"recipe":[]},
  {"id":"vrj494aw4","name":"Cokes","price":450,"isCraftable":true,"recipe":[{"itemId":"k5rd74me9","quantity":3},{"itemId":"43r72c1ab","quantity":3}]},
  {"id":"k5rd74me9","name":"Coal","price":130,"isCraftable":false,"recipe":[]},
  {"id":"43r72c1ab","name":"Charcoal","price":63,"isCraftable":false,"recipe":[]},
  {"id":"t7udcw3i2","name":"Silver Nugget","price":155,"isCraftable":false,"recipe":[]},
  {"id":"hw1r8mpwa","name":"Varnish of Purity","price":26000,"isCraftable":true,"recipe":[{"itemId":"q4n95tfbx","quantity":3},{"itemId":"q8hvdduwt","quantity":1},{"itemId":"yidr8kxu5","quantity":3}],"craftPreference":"buy"},
  {"id":"q4n95tfbx","name":"Coarse Bone Powder","price":5800,"isCraftable":true,"recipe":[{"itemId":"u0q07hdvc","quantity":10}],"craftPreference":"buy"},
  {"id":"u0q07hdvc","name":"Animal Bone","price":540,"isCraftable":false,"recipe":[]},
  {"id":"q8hvdduwt","name":"Stone Of Purity","price":5500,"isCraftable":false,"recipe":[]},
  {"id":"yidr8kxu5","name":"Varnish","price":730,"isCraftable":false,"recipe":[]},
  {"id":"matndysdy","name":"Blacksmith Frame","price":256000,"isCraftable":true,"recipe":[{"itemId":"pscfz4ki6","quantity":10},{"itemId":"ek52qp38l","quantity":1},{"itemId":"hw1r8mpwa","quantity":5}]},
  {"id":"pscfz4ki6","name":"Mithril Ore","price":9400,"isCraftable":false,"recipe":[]},
  {"id":"rqphe5k1g","name":"Asofe","price":7500,"isCraftable":false,"recipe":[]},
  {"id":"h2d9x1nwc","name":"Mold Glue","price":2000,"isCraftable":false,"recipe":[]},
  {"id":"d23l0j7o4","name":"Maestro Mold","price":320000,"isCraftable":true,"recipe":[{"itemId":"h2d9x1nwc","quantity":10},{"itemId":"matndysdy","quantity":1},{"itemId":"rqphe5k1g","quantity":5}]},
  {"id":"u73l6vdye","name":"Adamantite Nugget","price":1700,"isCraftable":false,"recipe":[]},
  {"id":"xjt2jbe9w","name":"Steel Mold","price":6300,"isCraftable":true,"recipe":[{"itemId":"tu6g7d66r","quantity":5},{"itemId":"me6xh8mct","quantity":5},{"itemId":"k5rd74me9","quantity":5}],"craftPreference":"buy"},
  {"id":"tu6g7d66r","name":"Iron Ore","price":650,"isCraftable":false,"recipe":[]},
  {"id":"myy67xiwx","name":"Artisan's Frame","price":250000,"isCraftable":true,"recipe":[{"itemId":"u73l6vdye","quantity":10},{"itemId":"xjt2jbe9w","quantity":1},{"itemId":"hw1r8mpwa","quantity":5}]}
];

// Migration helper: convert old buyPrice/sellPrice to price
const migrateData = (data) => {
  return data.map(item => {
    if (item.price !== undefined) return item;
    return {
      ...item,
      price: item.buyPrice || item.sellPrice || 0
    };
  });
};

export default function L2CraftPlanner() {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('l2-craft-items');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return migrateData(parsed);
    }
    return DEFAULT_DATA;
  });
  
  const [activeTab, setActiveTab] = useState('items');
  const [editingItem, setEditingItem] = useState(null);
  const [craftQuantity, setCraftQuantity] = useState(1);
  const [selectedCraftItem, setSelectedCraftItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDesc, setSortDesc] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null); // { itemId, field: 'price' }

  // New item form state
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    isCraftable: false,
    recipe: []
  });

  // craftPreference: 'auto' | 'buy' | 'craft' - stored per item
  // 'auto' = use calculated optimal
  // 'buy' = always buy this item, don't craft
  // 'craft' = always craft this item

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('l2-craft-items', JSON.stringify(items));
  }, [items]);

  // Calculate craft cost (always crafts everything craftable)
  const calculateCraftCost = (itemId, quantity = 1, visited = new Set()) => {
    if (visited.has(itemId)) return 0;
    visited.add(itemId);
    
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;
    
    if (!item.isCraftable || item.recipe.length === 0) {
      return item.price * quantity;
    }
    
    let totalCost = 0;
    for (const ingredient of item.recipe) {
      const ingredientItem = items.find(i => i.id === ingredient.itemId);
      if (!ingredientItem) continue;
      
      if (ingredientItem.isCraftable && ingredientItem.recipe.length > 0) {
        totalCost += calculateCraftCost(ingredient.itemId, ingredient.quantity * quantity, new Set(visited));
      } else {
        totalCost += ingredientItem.price * ingredient.quantity * quantity;
      }
    }
    return totalCost;
  };

  // Calculate cost if buying all direct ingredients (no sub-crafting)
  const calculateBuyCost = (itemId, quantity = 1) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.isCraftable || item.recipe.length === 0) {
      return item ? item.price * quantity : 0;
    }
    
    let totalCost = 0;
    for (const ingredient of item.recipe) {
      const ingredientItem = items.find(i => i.id === ingredient.itemId);
      if (ingredientItem) {
        totalCost += ingredientItem.price * ingredient.quantity * quantity;
      }
    }
    return totalCost;
  };

  // OPTIMAL: For each craftable ingredient, decide if crafting or buying is cheaper
  // Now respects craftPreference override
  const calculateOptimalCost = (itemId, quantity = 1, visited = new Set()) => {
    if (visited.has(itemId)) return { cost: 0, decisions: [] };
    visited.add(itemId);
    
    const item = items.find(i => i.id === itemId);
    if (!item) return { cost: 0, decisions: [] };
    
    // Base material - must buy
    if (!item.isCraftable || item.recipe.length === 0) {
      return { cost: item.price * quantity, decisions: [] };
    }
    
    // Calculate cost to craft this item (recursively optimal)
    let craftCost = 0;
    let allDecisions = [];
    
    for (const ingredient of item.recipe) {
      const ingredientItem = items.find(i => i.id === ingredient.itemId);
      if (!ingredientItem) continue;
      
      const ingQty = ingredient.quantity * quantity;
      
      if (ingredientItem.isCraftable && ingredientItem.recipe.length > 0) {
        // This ingredient is craftable - check preference first
        const pref = ingredientItem.craftPreference || 'auto';
        const optimalResult = calculateOptimalCost(ingredient.itemId, ingQty, new Set(visited));
        const buyCostForIng = ingredientItem.price * ingQty;
        
        let decision;
        let usedCost;
        
        if (pref === 'buy') {
          // Forced buy
          decision = 'BUY';
          usedCost = buyCostForIng;
        } else if (pref === 'craft') {
          // Forced craft
          decision = 'CRAFT';
          usedCost = optimalResult.cost;
        } else {
          // Auto - pick cheaper
          if (buyCostForIng <= optimalResult.cost) {
            decision = 'BUY';
            usedCost = buyCostForIng;
          } else {
            decision = 'CRAFT';
            usedCost = optimalResult.cost;
          }
        }
        
        craftCost += usedCost;
        allDecisions.push({
          itemId: ingredient.itemId,
          name: ingredientItem.name,
          quantity: ingQty,
          decision,
          forced: pref !== 'auto',
          preference: pref,
          buyCost: buyCostForIng,
          craftCost: optimalResult.cost,
          savings: decision === 'CRAFT' ? buyCostForIng - optimalResult.cost : optimalResult.cost - buyCostForIng
        });
        
        if (decision === 'CRAFT') {
          allDecisions = allDecisions.concat(optimalResult.decisions);
        }
      } else {
        // Base material - must buy
        craftCost += ingredientItem.price * ingQty;
      }
    }
    
    return { cost: craftCost, decisions: allDecisions };
  };

  // Get all craftable ingredients with their buy vs craft analysis
  const analyzeIngredients = (itemId) => {
    const analysis = [];
    const visited = new Set();
    
    const analyze = (id, qty = 1) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const item = items.find(i => i.id === id);
      if (!item || !item.isCraftable || item.recipe.length === 0) return;
      
      const buyCost = item.price * qty;
      const craftCost = calculateCraftCost(id, qty);
      const savings = buyCost - craftCost;
      const pref = item.craftPreference || 'auto';
      
      let decision;
      if (pref === 'buy') decision = 'BUY';
      else if (pref === 'craft') decision = 'CRAFT';
      else decision = savings > 0 ? 'CRAFT' : 'BUY';
      
      analysis.push({
        id,
        name: item.name,
        quantity: qty,
        buyCost,
        craftCost,
        savings,
        decision,
        preference: pref,
        forced: pref !== 'auto'
      });
      
      // Only recurse if we're crafting this item
      if (decision === 'CRAFT') {
        for (const ing of item.recipe) {
          analyze(ing.itemId, ing.quantity * qty);
        }
      }
    };
    
    analyze(itemId);
    return analysis;
  };
  
  // Update item preference
  const setItemPreference = (itemId, preference) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, craftPreference: preference } : item
    ));
  };

  // Update item price inline
  const updateItemPrice = (itemId, field, value) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, [field]: parseFloat(value) || 0 } : item
    ));
    setEditingPrice(null);
  };

  // Sorted items for dropdowns (alphabetical)
  const sortedItemsForDropdown = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // Get all base materials needed for crafting
  const getMaterialsList = (itemId, quantity = 1, materials = {}, visited = new Set()) => {
    if (visited.has(itemId)) return materials;
    visited.add(itemId);
    
    const item = items.find(i => i.id === itemId);
    if (!item) return materials;
    
    if (!item.isCraftable || item.recipe.length === 0) {
      materials[itemId] = (materials[itemId] || 0) + quantity;
      return materials;
    }
    
    for (const ingredient of item.recipe) {
      const ingredientItem = items.find(i => i.id === ingredient.itemId);
      if (!ingredientItem) continue;
      
      if (ingredientItem.isCraftable && ingredientItem.recipe.length > 0) {
        getMaterialsList(ingredient.itemId, ingredient.quantity * quantity, materials, new Set(visited));
      } else {
        materials[ingredient.itemId] = (materials[ingredient.itemId] || 0) + (ingredient.quantity * quantity);
      }
    }
    return materials;
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'craftCost':
          const craftCostA = a.isCraftable ? calculateCraftCost(a.id) : 0;
          const craftCostB = b.isCraftable ? calculateCraftCost(b.id) : 0;
          comparison = craftCostA - craftCostB;
          break;
        case 'profit':
          const profitA = a.isCraftable ? calculateProfit(a.price, calculateCraftCost(a.id)) : 0;
          const profitB = b.isCraftable ? calculateProfit(b.price, calculateCraftCost(b.id)) : 0;
          comparison = profitA - profitB;
          break;
        default:
          comparison = 0;
      }
      return sortDesc ? -comparison : comparison;
    });
    
    return result;
  }, [items, searchTerm, sortBy, sortDesc]);

  const craftableItems = items.filter(i => i.isCraftable);

  // Sorted craftable items for dropdowns
  const sortedCraftableItems = useMemo(() => {
    return [...craftableItems].sort((a, b) => a.name.localeCompare(b.name));
  }, [craftableItems]);

  // Add new item
  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    
    const item = {
      id: generateId(),
      name: newItem.name.trim(),
      price: parseFloat(newItem.price) || 0,
      isCraftable: newItem.isCraftable,
      recipe: []
    };
    
    setItems([...items, item]);
    setNewItem({ name: '', price: '', isCraftable: false, recipe: [] });
  };

  // Delete item
  const handleDeleteItem = (id) => {
    setItems(items.filter(i => i.id !== id));
    // Also remove from recipes
    setItems(prev => prev.map(item => ({
      ...item,
      recipe: item.recipe.filter(r => r.itemId !== id)
    })));
  };

  // Update item
  const handleUpdateItem = (updatedItem) => {
    setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
    setEditingItem(null);
  };

  // Add ingredient to recipe
  const handleAddIngredient = (itemId, ingredientId, quantity) => {
    if (itemId === ingredientId) return; // Can't add self
    
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      
      const existingIndex = item.recipe.findIndex(r => r.itemId === ingredientId);
      if (existingIndex >= 0) {
        const newRecipe = [...item.recipe];
        newRecipe[existingIndex].quantity += quantity;
        return { ...item, recipe: newRecipe };
      }
      
      return {
        ...item,
        recipe: [...item.recipe, { itemId: ingredientId, quantity }]
      };
    }));
  };

  // Remove ingredient from recipe
  const handleRemoveIngredient = (itemId, ingredientId) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        recipe: item.recipe.filter(r => r.itemId !== ingredientId)
      };
    }));
  };

  // Export data
  const handleExport = () => {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'l2-craft-data.json';
    a.click();
  };

  // Import data
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        setItems(data);
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
      color: '#c9b89d',
      fontFamily: '"Cinzel", "Times New Roman", serif',
      padding: '20px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        html, body, #root {
          margin: 0;
          padding: 0;
          min-height: 100vh;
          background: #0a0a0f;
        }
        
        input, select, button {
          font-family: 'Crimson Text', Georgia, serif;
        }
        
        input[type="text"], input[type="number"] {
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid #3d3526;
          color: #c9b89d;
          padding: 10px 14px;
          border-radius: 4px;
          font-size: 15px;
          transition: all 0.2s;
        }
        
        input:focus {
          outline: none;
          border-color: #8b7355;
          box-shadow: 0 0 10px rgba(139, 115, 85, 0.3);
        }
        
        .btn {
          background: linear-gradient(180deg, #3d3526 0%, #2a2419 100%);
          border: 1px solid #5c4d3a;
          color: #c9b89d;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.2s;
        }
        
        .btn:hover {
          background: linear-gradient(180deg, #4d4536 0%, #3a3429 100%);
          border-color: #8b7355;
          transform: translateY(-1px);
        }
        
        .btn-danger {
          background: linear-gradient(180deg, #4a2020 0%, #2a1010 100%);
          border-color: #6a3030;
        }
        
        .btn-danger:hover {
          background: linear-gradient(180deg, #5a3030 0%, #3a2020 100%);
          border-color: #8a4040;
        }
        
        .btn-success {
          background: linear-gradient(180deg, #204a20 0%, #102a10 100%);
          border-color: #306a30;
        }
        
        .btn-success:hover {
          background: linear-gradient(180deg, #305a30 0%, #203a20 100%);
          border-color: #408a40;
        }
        
        .card {
          background: linear-gradient(180deg, rgba(25, 25, 35, 0.95) 0%, rgba(15, 15, 22, 0.98) 100%);
          border: 1px solid #2a2520;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        
        .profit-positive { color: #5cb85c; text-shadow: 0 0 10px rgba(92, 184, 92, 0.3); }
        .profit-negative { color: #d9534f; text-shadow: 0 0 10px rgba(217, 83, 79, 0.3); }
        
        .tab {
          padding: 12px 24px;
          background: transparent;
          border: none;
          color: #6b5d4d;
          cursor: pointer;
          font-family: 'Cinzel', serif;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          transition: all 0.3s;
          position: relative;
        }
        
        .tab:hover { color: #c9b89d; }
        
        .tab.active {
          color: #d4c4a8;
        }
        
        .tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 20%;
          right: 20%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #8b7355, transparent);
        }
        
        .table-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr 100px;
          padding: 12px 16px;
          background: rgba(30, 30, 40, 0.6);
          border-bottom: 1px solid #2a2520;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 12px;
          color: #8b7d6d;
        }
        
        .table-header span[style*="cursor: pointer"]:hover {
          color: #c9b89d;
        }
        
        .sortable-header {
          cursor: pointer;
          user-select: none;
          transition: color 0.2s;
        }
        
        .sortable-header:hover {
          color: #c9b89d;
        }
        
        .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr 100px;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(42, 37, 32, 0.5);
          align-items: center;
          transition: background 0.2s;
        }
        
        .table-row:hover {
          background: rgba(139, 115, 85, 0.1);
        }
        
        .ingredient-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(60, 50, 40, 0.6);
          border: 1px solid #4d4030;
          padding: 6px 12px;
          border-radius: 4px;
          margin: 4px;
          font-size: 13px;
        }
        
        .scrollable {
          max-height: 400px;
          overflow-y: auto;
        }
        
        .scrollable::-webkit-scrollbar {
          width: 8px;
        }
        
        .scrollable::-webkit-scrollbar-track {
          background: rgba(20, 20, 30, 0.5);
        }
        
        .scrollable::-webkit-scrollbar-thumb {
          background: #3d3526;
          border-radius: 4px;
        }
        
        .scrollable::-webkit-scrollbar-thumb:hover {
          background: #5c4d3a;
        }
        
        .ornament {
          width: 100%;
          height: 20px;
          background: linear-gradient(90deg, transparent 0%, #3d3526 20%, #8b7355 50%, #3d3526 80%, transparent 100%);
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 10'%3E%3Cpath d='M0,5 Q25,0 50,5 T100,5' fill='none' stroke='white' stroke-width='2'/%3E%3C/svg%3E");
          -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 10'%3E%3Cpath d='M0,5 Q25,0 50,5 T100,5' fill='none' stroke='white' stroke-width='2'/%3E%3C/svg%3E");
          opacity: 0.6;
        }
        
        .checkbox-custom {
          appearance: none;
          width: 20px;
          height: 20px;
          border: 2px solid #5c4d3a;
          border-radius: 4px;
          background: rgba(20, 20, 30, 0.8);
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        
        .checkbox-custom:checked {
          background: #3d5a3d;
          border-color: #5a8a5a;
        }
        
        .checkbox-custom:checked::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #90ee90;
          font-size: 14px;
        }
      `}</style>

      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{
          fontSize: '42px',
          fontWeight: 700,
          color: '#d4c4a8',
          textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 30px rgba(139, 115, 85, 0.2)',
          marginBottom: '8px',
          letterSpacing: '4px'
        }}>
          ⚔ CRAFT PLANNER ⚔
        </h1>
        <p style={{ color: '#6b5d4d', letterSpacing: '3px', fontSize: '13px' }}>
          LINEAGE II ECONOMY CALCULATOR
        </p>
        <div className="ornament" style={{ marginTop: '20px' }} />
      </header>

      {/* Navigation */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '10px', 
        marginBottom: '30px',
        borderBottom: '1px solid #2a2520',
        paddingBottom: '0'
      }}>
        <button 
          className={`tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          📦 Items
        </button>
        <button 
          className={`tab ${activeTab === 'recipes' ? 'active' : ''}`}
          onClick={() => setActiveTab('recipes')}
        >
          📜 Recipes
        </button>
        <button 
          className={`tab ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          🧮 Calculator
        </button>
        <button 
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
      </nav>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', letterSpacing: '2px' }}>ITEM DATABASE</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn" onClick={handleExport}>Export</button>
              <label className="btn" style={{ cursor: 'pointer' }}>
                Import
                <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Add Item Form */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '2fr 1fr 1fr auto auto', 
            gap: '12px', 
            marginBottom: '20px',
            padding: '16px',
            background: 'rgba(30, 30, 40, 0.4)',
            borderRadius: '6px'
          }}>
            <input
              type="text"
              placeholder="Item name..."
              value={newItem.name}
              onChange={e => setNewItem({...newItem, name: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              style={{ flex: 2 }}
            />
            <input
              type="number"
              placeholder="Price"
              value={newItem.price}
              onChange={e => setNewItem({...newItem, price: e.target.value})}
              style={{ flex: 1 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                className="checkbox-custom"
                checked={newItem.isCraftable}
                onChange={e => setNewItem({...newItem, isCraftable: e.target.checked})}
              />
              <span style={{ fontSize: '13px' }}>Craftable</span>
            </label>
            <button className="btn btn-success" onClick={handleAddItem}>+ Add</button>
          </div>

          {/* Search & Sort */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="🔍 Search items..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            />
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              style={{
                background: 'rgba(20, 20, 30, 0.8)',
                border: '1px solid #3d3526',
                color: '#c9b89d',
                padding: '10px 14px',
                borderRadius: '4px'
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="profit">Sort by Profit</option>
            </select>
            <button 
              className="btn" 
              onClick={() => setSortDesc(!sortDesc)}
              style={{ width: '50px' }}
            >
              {sortDesc ? '↓' : '↑'}
            </button>
          </div>

          {/* Items Table */}
          <div className="table-header" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 120px 100px' }}>
            <span 
              onClick={() => { setSortBy('name'); if (sortBy === 'name') setSortDesc(!sortDesc); }}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Item {sortBy === 'name' && (sortDesc ? '↓' : '↑')}
            </span>
            <span 
              onClick={() => { setSortBy('price'); if (sortBy === 'price') setSortDesc(!sortDesc); }}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Price {sortBy === 'price' && (sortDesc ? '↓' : '↑')}
            </span>
            <span 
              onClick={() => { setSortBy('craftCost'); if (sortBy === 'craftCost') setSortDesc(!sortDesc); }}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Craft Cost {sortBy === 'craftCost' && (sortDesc ? '↓' : '↑')}
            </span>
            <span 
              onClick={() => { setSortBy('profit'); if (sortBy === 'profit') setSortDesc(!sortDesc); }}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Profit {sortBy === 'profit' && (sortDesc ? '↓' : '↑')}
            </span>
            <span>Preference</span>
            <span>Actions</span>
          </div>
          
          <div className="scrollable">
            {filteredItems.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b5d4d' }}>
                No items yet. Add your first item above.
              </div>
            ) : (
              filteredItems.map(item => {
                const craftCost = item.isCraftable ? calculateCraftCost(item.id) : null;
                const profit = craftCost !== null ? calculateProfit(item.price, craftCost) : null;
                const pref = item.craftPreference || 'auto';
                
                return (
                  <div key={item.id} className="table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 120px 100px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.isCraftable && <span title="Craftable">🔨</span>}
                      <strong>{item.name}</strong>
                    </span>
                    <span 
                      onDoubleClick={() => setEditingPrice({ itemId: item.id, field: 'price' })}
                      style={{ cursor: 'pointer' }}
                      title="Double-click to edit"
                    >
                      {editingPrice?.itemId === item.id && editingPrice?.field === 'price' ? (
                        <input
                          type="number"
                          defaultValue={item.price}
                          autoFocus
                          onBlur={(e) => updateItemPrice(item.id, 'price', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateItemPrice(item.id, 'price', e.target.value);
                            if (e.key === 'Escape') setEditingPrice(null);
                          }}
                          style={{ 
                            width: '80px', 
                            padding: '4px 8px',
                            background: 'rgba(20, 20, 30, 0.9)',
                            border: '1px solid #8b7355',
                            color: '#c9b89d',
                            borderRadius: '3px'
                          }}
                        />
                      ) : (
                        formatNumber(item.price)
                      )}
                    </span>
                    <span>{craftCost !== null ? formatNumber(craftCost) : '-'}</span>
                    <span className={profit > 0 ? 'profit-positive' : profit < 0 ? 'profit-negative' : ''}>
                      {profit !== null ? (
                        <>
                          {profit >= 0 ? '+' : ''}{formatNumber(profit)}
                          <small style={{ marginLeft: '6px', opacity: 0.7 }}>
                            ({calculateMargin(item.price, craftCost)}%)
                          </small>
                        </>
                      ) : '-'}
                    </span>
                    <span>
                      {item.isCraftable ? (
                        <select
                          value={pref}
                          onChange={e => setItemPreference(item.id, e.target.value)}
                          style={{
                            background: pref === 'buy' ? 'rgba(100, 50, 50, 0.4)' : 
                                       pref === 'craft' ? 'rgba(50, 100, 50, 0.4)' : 
                                       'rgba(20, 20, 30, 0.8)',
                            border: '1px solid #3d3526',
                            color: '#c9b89d',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            width: '100%'
                          }}
                        >
                          <option value="auto">⚡ Auto</option>
                          <option value="craft">🔨 Craft</option>
                          <option value="buy">💰 Buy</option>
                        </select>
                      ) : (
                        <span style={{ color: '#4a4030', fontSize: '12px' }}>base mat</span>
                      )}
                    </span>
                    <span style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="btn" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setEditingItem(item)}
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        🗑️
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
          
          <div style={{ marginTop: '16px', color: '#6b5d4d', fontSize: '13px' }}>
            {items.length} items total · {craftableItems.length} craftable
          </div>
        </div>
      )}

      {/* Recipes Tab */}
      {activeTab === 'recipes' && (
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '20px', letterSpacing: '2px', marginBottom: '20px' }}>
            RECIPE MANAGEMENT
          </h2>
          
          {craftableItems.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b5d4d' }}>
              No craftable items. Mark items as craftable in the Items tab.
            </div>
          ) : (
            <div className="scrollable" style={{ maxHeight: '600px' }}>
              {craftableItems.map(item => (
                <div key={item.id} style={{ 
                  marginBottom: '20px', 
                  padding: '16px',
                  background: 'rgba(30, 30, 40, 0.4)',
                  borderRadius: '6px',
                  border: '1px solid #2a2520'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: '#d4c4a8' }}>🔨 {item.name}</h3>
                    <span style={{ color: '#6b5d4d', fontSize: '13px' }}>
                      Craft Cost: {formatNumber(calculateCraftCost(item.id))} | 
                      Sell: {formatNumber(item.price)} | 
                      <span className={calculateProfit(item.price, calculateCraftCost(item.id)) >= 0 ? 'profit-positive' : 'profit-negative'}>
                        {' '}Profit: {formatNumber(calculateProfit(item.price, calculateCraftCost(item.id)))}
                      </span>
                    </span>
                  </div>
                  
                  {/* Current ingredients */}
                  <div style={{ marginBottom: '12px' }}>
                    {item.recipe.length === 0 ? (
                      <span style={{ color: '#6b5d4d', fontStyle: 'italic' }}>No ingredients defined</span>
                    ) : (
                      item.recipe.map(ing => {
                        const ingItem = items.find(i => i.id === ing.itemId);
                        return ingItem ? (
                          <span key={ing.itemId} className="ingredient-tag">
                            <span>{ingItem.name}</span>
                            <span style={{ color: '#8b7355' }}>×{ing.quantity}</span>
                            <span style={{ color: '#6b5d4d', fontSize: '11px' }}>
                              ({formatNumber(ingItem.price * ing.quantity)})
                            </span>
                            <button 
                              onClick={() => handleRemoveIngredient(item.id, ing.itemId)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: '#d9534f', 
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })
                    )}
                  </div>
                  
                  {/* Add ingredient */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select
                      id={`ing-select-${item.id}`}
                      style={{
                        background: 'rgba(20, 20, 30, 0.8)',
                        border: '1px solid #3d3526',
                        color: '#c9b89d',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        flex: 1
                      }}
                    >
                      <option value="">Select ingredient...</option>
                      {sortedItemsForDropdown
                        .filter(i => i.id !== item.id && !item.recipe.find(r => r.itemId === i.id))
                        .map(i => (
                          <option key={i.id} value={i.id}>{i.name} ({formatNumber(i.price)})</option>
                        ))}
                    </select>
                    <input
                      id={`ing-qty-${item.id}`}
                      type="number"
                      placeholder="Qty"
                      defaultValue={1}
                      min={1}
                      style={{ width: '80px' }}
                    />
                    <button 
                      className="btn btn-success"
                      onClick={() => {
                        const select = document.getElementById(`ing-select-${item.id}`);
                        const qtyInput = document.getElementById(`ing-qty-${item.id}`);
                        if (select.value) {
                          handleAddIngredient(item.id, select.value, parseInt(qtyInput.value) || 1);
                          select.value = '';
                          qtyInput.value = 1;
                        }
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '20px', letterSpacing: '2px', marginBottom: '20px' }}>
            CRAFT CALCULATOR
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Item Selection */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#8b7d6d', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Select Item to Craft
              </label>
              <select
                value={selectedCraftItem || ''}
                onChange={e => setSelectedCraftItem(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(20, 20, 30, 0.8)',
                  border: '1px solid #3d3526',
                  color: '#c9b89d',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '15px'
                }}
              >
                <option value="">Choose an item...</option>
                {sortedCraftableItems.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            
            {/* Quantity */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#8b7d6d', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Quantity
              </label>
              <input
                type="number"
                value={craftQuantity}
                onChange={e => setCraftQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          {selectedCraftItem && (() => {
            const item = items.find(i => i.id === selectedCraftItem);
            if (!item) return null;
            
            // Calculate all three strategies
            const buyAllCost = calculateBuyCost(item.id, craftQuantity);
            const craftAllCost = calculateCraftCost(item.id, craftQuantity);
            const optimalResult = calculateOptimalCost(item.id, craftQuantity);
            const optimalCost = optimalResult.cost;
            
            const totalSellValue = item.price * craftQuantity;
            
            const profitBuyAll = totalSellValue - buyAllCost;
            const profitCraftAll = totalSellValue - craftAllCost;
            const profitOptimal = totalSellValue - optimalCost;
            
            const materials = getMaterialsList(item.id, craftQuantity);
            const ingredientAnalysis = analyzeIngredients(item.id);
            
            return (
              <div style={{ marginTop: '30px' }}>
                <div className="ornament" style={{ marginBottom: '20px' }} />
                
                {/* Strategy Comparison */}
                <h3 style={{ color: '#d4c4a8', marginBottom: '16px', fontSize: '16px', letterSpacing: '1px' }}>
                  ⚔️ STRATEGY COMPARISON
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  {/* Buy All Strategy */}
                  <div style={{ 
                    background: 'rgba(30, 30, 40, 0.6)', 
                    padding: '16px', 
                    borderRadius: '6px',
                    border: '1px solid #2a2520'
                  }}>
                    <div style={{ color: '#8b7d6d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                      Strategy: Buy Ingredients
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#6b5d4d' }}>Cost:</span>
                      <span style={{ color: '#d9534f' }}>{formatNumber(buyAllCost)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b5d4d' }}>Profit:</span>
                      <span className={profitBuyAll >= 0 ? 'profit-positive' : 'profit-negative'}>
                        {profitBuyAll >= 0 ? '+' : ''}{formatNumber(profitBuyAll)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Craft All Strategy */}
                  <div style={{ 
                    background: 'rgba(30, 30, 40, 0.6)', 
                    padding: '16px', 
                    borderRadius: '6px',
                    border: '1px solid #2a2520'
                  }}>
                    <div style={{ color: '#8b7d6d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                      Strategy: Craft Everything
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#6b5d4d' }}>Cost:</span>
                      <span style={{ color: '#d9534f' }}>{formatNumber(craftAllCost)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b5d4d' }}>Profit:</span>
                      <span className={profitCraftAll >= 0 ? 'profit-positive' : 'profit-negative'}>
                        {profitCraftAll >= 0 ? '+' : ''}{formatNumber(profitCraftAll)}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#5cb85c', marginTop: '8px' }}>
                      +{formatNumber(profitCraftAll - profitBuyAll)} vs buying
                    </div>
                  </div>
                  
                  {/* Optimal Strategy */}
                  <div style={{ 
                    background: 'linear-gradient(180deg, rgba(50, 70, 50, 0.6) 0%, rgba(30, 50, 30, 0.6) 100%)', 
                    padding: '16px', 
                    borderRadius: '6px',
                    border: '2px solid #4a6a4a'
                  }}>
                    <div style={{ color: '#90ee90', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                      ★ OPTIMAL STRATEGY
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#6b5d4d' }}>Cost:</span>
                      <span style={{ color: '#d9534f' }}>{formatNumber(optimalCost)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b5d4d' }}>Profit:</span>
                      <span className="profit-positive" style={{ fontSize: '18px', fontWeight: 600 }}>
                        +{formatNumber(profitOptimal)}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#90ee90', marginTop: '8px' }}>
                      {calculateMargin(totalSellValue, optimalCost)}% margin
                    </div>
                  </div>
                </div>
                
                {/* Sell Value Card */}
                <div style={{ 
                  background: 'rgba(30, 30, 40, 0.6)', 
                  padding: '16px', 
                  borderRadius: '6px',
                  border: '1px solid #2a2520',
                  textAlign: 'center',
                  marginBottom: '24px'
                }}>
                  <span style={{ color: '#6b5d4d', marginRight: '16px' }}>Sell Value:</span>
                  <span style={{ fontSize: '24px', fontWeight: 600, color: '#5bc0de' }}>
                    {formatNumber(totalSellValue)}
                  </span>
                </div>
                
                {/* Buy vs Craft Decisions */}
                <h3 style={{ color: '#d4c4a8', marginBottom: '16px', fontSize: '16px', letterSpacing: '1px' }}>
                  🎯 BUY vs CRAFT DECISIONS
                </h3>
                <div style={{ 
                  background: 'rgba(30, 30, 40, 0.4)', 
                  borderRadius: '6px',
                  border: '1px solid #2a2520',
                  overflow: 'hidden',
                  marginBottom: '24px'
                }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 140px',
                    padding: '10px 16px',
                    background: 'rgba(30, 30, 40, 0.6)',
                    borderBottom: '1px solid #2a2520',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#8b7d6d'
                  }}>
                    <span>Ingredient</span>
                    <span>Buy Cost</span>
                    <span>Craft Cost</span>
                    <span>Difference</span>
                    <span>Decision</span>
                  </div>
                  {ingredientAnalysis.map((ing, idx) => (
                    <div key={idx} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 140px',
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(42, 37, 32, 0.3)',
                      background: ing.decision === 'BUY' ? 'rgba(100, 50, 50, 0.1)' : 'rgba(50, 100, 50, 0.1)'
                    }}>
                      <span>
                        {ing.name}
                        {ing.quantity > 1 && <span style={{ color: '#8b7355' }}> ×{ing.quantity}</span>}
                        {ing.forced && <span style={{ color: '#ffcc00', marginLeft: '6px', fontSize: '10px' }}>⚠ FORCED</span>}
                      </span>
                      <span>{formatNumber(ing.buyCost)}</span>
                      <span>{formatNumber(ing.craftCost)}</span>
                      <span className={ing.savings > 0 ? 'profit-positive' : 'profit-negative'}>
                        {ing.decision === 'CRAFT' ? '+' : ''}{formatNumber(ing.decision === 'CRAFT' ? ing.savings : -ing.savings)}
                      </span>
                      <span>
                        <select
                          value={ing.preference}
                          onChange={e => setItemPreference(ing.id, e.target.value)}
                          style={{
                            background: ing.preference === 'buy' ? 'rgba(100, 50, 50, 0.6)' : 
                                       ing.preference === 'craft' ? 'rgba(50, 100, 50, 0.6)' : 
                                       ing.decision === 'CRAFT' ? 'rgba(50, 100, 50, 0.3)' : 'rgba(100, 50, 50, 0.3)',
                            border: '1px solid #3d3526',
                            color: '#c9b89d',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            width: '100%'
                          }}
                        >
                          <option value="auto">⚡ Auto ({ing.savings > 0 ? 'Craft' : 'Buy'})</option>
                          <option value="craft">🔨 Force Craft</option>
                          <option value="buy">💰 Force Buy</option>
                        </select>
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Smart Shopping List */}
                {(() => {
                  // Build shopping list respecting preferences
                  const toBuy = []; // Items to purchase directly
                  const toCraft = []; // Items to craft with their materials
                  
                  const processItem = (itemId, quantity, depth = 0, parentName = null) => {
                    const itm = items.find(i => i.id === itemId);
                    if (!itm) return;
                    
                    // Base material - must buy
                    if (!itm.isCraftable || itm.recipe.length === 0) {
                      const existing = toBuy.find(b => b.id === itemId && b.forCraft === parentName);
                      if (existing) {
                        existing.quantity += quantity;
                      } else {
                        toBuy.push({
                          id: itemId,
                          name: itm.name,
                          quantity,
                          unitPrice: itm.price,
                          forCraft: parentName,
                          isBaseMaterial: true
                        });
                      }
                      return;
                    }
                    
                    // Craftable item - check preference
                    const pref = itm.craftPreference || 'auto';
                    const craftCostSingle = calculateCraftCost(itemId, 1);
                    const shouldBuy = pref === 'buy' || (pref === 'auto' && itm.price <= craftCostSingle);
                    
                    if (shouldBuy) {
                      // Buy this craftable item directly
                      const existing = toBuy.find(b => b.id === itemId);
                      if (existing) {
                        existing.quantity += quantity;
                      } else {
                        toBuy.push({
                          id: itemId,
                          name: itm.name,
                          quantity,
                          unitPrice: itm.price,
                          forCraft: parentName,
                          isBaseMaterial: false,
                          preference: pref
                        });
                      }
                    } else {
                      // Craft this item - add to craft list
                      const craftEntry = {
                        id: itemId,
                        name: itm.name,
                        quantity,
                        materials: []
                      };
                      
                      // Process recipe ingredients
                      for (const ing of itm.recipe) {
                        const ingItem = items.find(i => i.id === ing.itemId);
                        if (!ingItem) continue;
                        
                        const ingQty = ing.quantity * quantity;
                        const ingPref = ingItem.craftPreference || 'auto';
                        const ingCraftCost = ingItem.isCraftable ? calculateCraftCost(ing.itemId, 1) : ingItem.price;
                        const ingShouldBuy = !ingItem.isCraftable || 
                                            ingItem.recipe.length === 0 || 
                                            ingPref === 'buy' || 
                                            (ingPref === 'auto' && ingItem.price <= ingCraftCost);
                        
                        craftEntry.materials.push({
                          id: ing.itemId,
                          name: ingItem.name,
                          quantity: ingQty,
                          unitPrice: ingItem.price,
                          action: ingShouldBuy ? 'BUY' : 'CRAFT'
                        });
                        
                        // Recurse
                        processItem(ing.itemId, ingQty, depth + 1, itm.name);
                      }
                      
                      toCraft.push(craftEntry);
                    }
                  };
                  
                  // Add the MAIN item first as a crafting step
                  const mainCraftEntry = {
                    id: item.id,
                    name: item.name,
                    quantity: craftQuantity,
                    isMainItem: true,
                    materials: []
                  };
                  
                  for (const ing of item.recipe) {
                    const ingItem = items.find(i => i.id === ing.itemId);
                    if (!ingItem) continue;
                    
                    const ingQty = ing.quantity * craftQuantity;
                    const ingPref = ingItem.craftPreference || 'auto';
                    const ingCraftCost = ingItem.isCraftable ? calculateCraftCost(ing.itemId, 1) : ingItem.price;
                    const ingShouldBuy = !ingItem.isCraftable || 
                                        ingItem.recipe.length === 0 || 
                                        ingPref === 'buy' || 
                                        (ingPref === 'auto' && ingItem.price <= ingCraftCost);
                    
                    mainCraftEntry.materials.push({
                      id: ing.itemId,
                      name: ingItem.name,
                      quantity: ingQty,
                      unitPrice: ingItem.price,
                      action: ingShouldBuy ? 'BUY' : 'CRAFT'
                    });
                  }
                  
                  toCraft.push(mainCraftEntry);
                  
                  // Process child recipes
                  for (const ing of item.recipe) {
                    processItem(ing.itemId, ing.quantity * craftQuantity, 0, item.name);
                  }
                  
                  // Also add non-craftable direct ingredients
                  for (const ing of item.recipe) {
                    const ingItem = items.find(i => i.id === ing.itemId);
                    if (ingItem && (!ingItem.isCraftable || ingItem.recipe.length === 0)) {
                      const existing = toBuy.find(b => b.id === ing.itemId && b.forCraft === item.name);
                      if (!existing) {
                        toBuy.push({
                          id: ing.itemId,
                          name: ingItem.name,
                          quantity: ing.quantity * craftQuantity,
                          unitPrice: ingItem.price,
                          forCraft: item.name,
                          isBaseMaterial: true
                        });
                      }
                    }
                  }
                  
                  // Consolidate toBuy by item (sum quantities)
                  const consolidatedBuy = [];
                  toBuy.forEach(b => {
                    const existing = consolidatedBuy.find(c => c.id === b.id);
                    if (existing) {
                      existing.quantity += b.quantity;
                      if (b.forCraft && !existing.forCrafts.includes(b.forCraft)) {
                        existing.forCrafts.push(b.forCraft);
                      }
                    } else {
                      consolidatedBuy.push({
                        ...b,
                        forCrafts: b.forCraft ? [b.forCraft] : []
                      });
                    }
                  });
                  
                  const totalBuyCost = consolidatedBuy.reduce((sum, b) => sum + (b.unitPrice * b.quantity), 0);
                  
                  return (
                    <>
                      {/* What to Buy */}
                      <h3 style={{ color: '#d4c4a8', marginBottom: '16px', fontSize: '16px', letterSpacing: '1px' }}>
                        💰 SHOPPING LIST (What to Buy)
                      </h3>
                      <div style={{ 
                        background: 'rgba(30, 30, 40, 0.4)', 
                        borderRadius: '6px',
                        border: '1px solid #2a2520',
                        overflow: 'hidden',
                        marginBottom: '24px'
                      }}>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '2fr 1fr 1fr 1fr',
                          padding: '10px 16px',
                          background: 'rgba(30, 30, 40, 0.6)',
                          borderBottom: '1px solid #2a2520',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color: '#8b7d6d'
                        }}>
                          <span>Item</span>
                          <span>Quantity</span>
                          <span>Unit Price</span>
                          <span>Total</span>
                        </div>
                        {consolidatedBuy.length === 0 ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#6b5d4d' }}>
                            Nothing to buy - all items crafted
                          </div>
                        ) : (
                          consolidatedBuy.map((b, idx) => (
                            <div key={idx} style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '2fr 1fr 1fr 1fr',
                              padding: '12px 16px',
                              borderBottom: '1px solid rgba(42, 37, 32, 0.3)'
                            }}>
                              <span>
                                {b.name}
                                {!b.isBaseMaterial && (
                                  <span style={{ 
                                    marginLeft: '8px', 
                                    fontSize: '10px', 
                                    padding: '2px 6px', 
                                    background: 'rgba(100, 50, 50, 0.4)', 
                                    borderRadius: '3px',
                                    color: '#ff9999'
                                  }}>
                                    buying instead of crafting
                                  </span>
                                )}
                              </span>
                              <span style={{ color: '#8b7355' }}>×{formatNumber(b.quantity)}</span>
                              <span 
                                onClick={() => setEditingPrice({ itemId: b.id, field: 'price' })}
                                style={{ cursor: 'pointer', padding: '2px 6px', borderRadius: '3px', background: 'rgba(139, 115, 85, 0.2)' }}
                                title="Click to edit price"
                              >
                                {editingPrice?.itemId === b.id ? (
                                  <input
                                    type="number"
                                    defaultValue={b.unitPrice}
                                    autoFocus
                                    onBlur={(e) => updateItemPrice(b.id, 'price', e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') updateItemPrice(b.id, 'price', e.target.value);
                                      if (e.key === 'Escape') setEditingPrice(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ 
                                      width: '70px', 
                                      padding: '2px 6px',
                                      background: 'rgba(20, 20, 30, 0.9)',
                                      border: '1px solid #8b7355',
                                      color: '#c9b89d',
                                      borderRadius: '3px',
                                      fontSize: '13px'
                                    }}
                                  />
                                ) : (
                                  formatNumber(b.unitPrice)
                                )}
                              </span>
                              <span style={{ color: '#d9534f' }}>{formatNumber(b.unitPrice * b.quantity)}</span>
                            </div>
                          ))
                        )}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '2fr 1fr 1fr 1fr',
                          padding: '12px 16px',
                          background: 'rgba(30, 30, 40, 0.6)',
                          fontWeight: 600
                        }}>
                          <span>TOTAL TO SPEND</span>
                          <span></span>
                          <span></span>
                          <span style={{ color: '#d9534f', fontSize: '16px' }}>{formatNumber(totalBuyCost)}</span>
                        </div>
                      </div>
                      
                      {/* What to Craft */}
                      {toCraft.length > 0 && (
                        <>
                          <h3 style={{ color: '#d4c4a8', marginBottom: '16px', fontSize: '16px', letterSpacing: '1px' }}>
                            🔨 CRAFTING STEPS
                          </h3>
                          {toCraft.map((craft, idx) => (
                            <div key={idx} style={{ 
                              background: craft.isMainItem 
                                ? 'rgba(70, 70, 50, 0.3)' 
                                : 'rgba(50, 70, 50, 0.2)', 
                              borderRadius: '6px',
                              border: craft.isMainItem 
                                ? '2px solid #8b7355' 
                                : '1px solid #3a5a3a',
                              padding: '16px',
                              marginBottom: '12px'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '12px'
                              }}>
                                <span style={{ 
                                  fontSize: craft.isMainItem ? '17px' : '15px', 
                                  fontWeight: 600, 
                                  color: craft.isMainItem ? '#d4c4a8' : '#90ee90' 
                                }}>
                                  {craft.isMainItem ? '⭐' : '🔨'} Craft: {craft.name} ×{craft.quantity}
                                  {craft.isMainItem && (
                                    <span style={{ 
                                      marginLeft: '10px', 
                                      fontSize: '11px', 
                                      padding: '3px 8px', 
                                      background: 'rgba(139, 115, 85, 0.4)', 
                                      borderRadius: '3px',
                                      color: '#c9b89d'
                                    }}>
                                      MAIN ITEM
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '2fr 1fr 1fr',
                                gap: '4px',
                                fontSize: '13px'
                              }}>
                                <span style={{ color: '#6b5d4d', fontSize: '11px', textTransform: 'uppercase' }}>Material</span>
                                <span style={{ color: '#6b5d4d', fontSize: '11px', textTransform: 'uppercase' }}>Qty Needed</span>
                                <span style={{ color: '#6b5d4d', fontSize: '11px', textTransform: 'uppercase' }}>Source</span>
                                {craft.materials.map((mat, mIdx) => (
                                  <React.Fragment key={mIdx}>
                                    <span>{mat.name}</span>
                                    <span style={{ color: '#8b7355' }}>×{formatNumber(mat.quantity)}</span>
                                    <span style={{ 
                                      color: mat.action === 'BUY' ? '#ff9999' : '#90ee90',
                                      fontWeight: 500
                                    }}>
                                      {mat.action === 'BUY' ? '💰 Buy' : '🔨 Craft'}
                                    </span>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: '20px', letterSpacing: '2px', marginBottom: '20px' }}>
            PROFIT ANALYTICS
          </h2>
          
          {craftableItems.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b5d4d' }}>
              No craftable items to analyze. Add some recipes first.
            </div>
          ) : (
            <>
              {/* Top profitable items */}
              <h3 style={{ color: '#d4c4a8', marginBottom: '16px', fontSize: '16px', letterSpacing: '1px' }}>
                💰 PROFIT RANKING
              </h3>
              <div style={{ 
                background: 'rgba(30, 30, 40, 0.4)', 
                borderRadius: '6px',
                border: '1px solid #2a2520',
                overflow: 'hidden',
                marginBottom: '30px'
              }}>
                {craftableItems
                  .map(item => ({
                    ...item,
                    craftCost: calculateCraftCost(item.id),
                    profit: calculateProfit(item.price, calculateCraftCost(item.id))
                  }))
                  .sort((a, b) => b.profit - a.profit)
                  .map((item, index) => (
                    <div key={item.id} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '40px 2fr 1fr 1fr 1fr',
                      padding: '14px 16px',
                      borderBottom: '1px solid rgba(42, 37, 32, 0.3)',
                      alignItems: 'center'
                    }}>
                      <span style={{ 
                        color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#6b5d4d',
                        fontWeight: 600
                      }}>
                        #{index + 1}
                      </span>
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      <span style={{ color: '#6b5d4d' }}>Cost: {formatNumber(item.craftCost)}</span>
                      <span style={{ color: '#5bc0de' }}>Sell: {formatNumber(item.price)}</span>
                      <span className={item.profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                        {item.profit >= 0 ? '+' : ''}{formatNumber(item.profit)} ({calculateMargin(item.price, item.craftCost)}%)
                      </span>
                    </div>
                  ))}
              </div>
              
              {/* Summary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ 
                  background: 'rgba(30, 30, 40, 0.6)', 
                  padding: '20px', 
                  borderRadius: '6px',
                  textAlign: 'center',
                  border: '1px solid #2a2520'
                }}>
                  <div style={{ color: '#6b5d4d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    Total Items
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#d4c4a8' }}>
                    {items.length}
                  </div>
                </div>
                
                <div style={{ 
                  background: 'rgba(30, 30, 40, 0.6)', 
                  padding: '20px', 
                  borderRadius: '6px',
                  textAlign: 'center',
                  border: '1px solid #2a2520'
                }}>
                  <div style={{ color: '#6b5d4d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    Craftable Items
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#8b7355' }}>
                    {craftableItems.length}
                  </div>
                </div>
                
                <div style={{ 
                  background: 'rgba(30, 30, 40, 0.6)', 
                  padding: '20px', 
                  borderRadius: '6px',
                  textAlign: 'center',
                  border: '1px solid #2a2520'
                }}>
                  <div style={{ color: '#6b5d4d', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    Profitable Crafts
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700 }} className="profit-positive">
                    {craftableItems.filter(i => calculateProfit(i.price, calculateCraftCost(i.id)) > 0).length}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Edit Item</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                value={editingItem.name}
                onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                placeholder="Item name"
              />
              <input
                type="number"
                value={editingItem.price}
                onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value) || 0})}
                placeholder="Price"
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  className="checkbox-custom"
                  checked={editingItem.isCraftable}
                  onChange={e => setEditingItem({...editingItem, isCraftable: e.target.checked})}
                />
                <span>Craftable</span>
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setEditingItem(null)}>Cancel</button>
              <button className="btn btn-success" onClick={() => handleUpdateItem(editingItem)}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ textAlign: 'center', marginTop: '40px', color: '#4a4030', fontSize: '12px' }}>
        <div className="ornament" style={{ marginBottom: '16px' }} />
        Data persists in browser localStorage · Export regularly
      </footer>
    </div>
  );
}
