import React, { useState } from 'react';

const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

function PlanSelector({ plans, currentPlan, onSelectPlan, onCreatePlan }) {
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());

  const handleCreatePlan = () => {
    onCreatePlan(newMonth, newYear);
    setShowNewPlanForm(false);
  };

  return (
    <div className="plan-selector">
      <div className="plan-selector-header">
        <div className="current-plan">
          <label>Aktualny plan:</label>
          <select 
            value={currentPlan?.id || ''} 
            onChange={(e) => {
              const plan = plans.find(p => p.id === parseInt(e.target.value));
              onSelectPlan(plan);
            }}
          >
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>
                {MONTHS[plan.month - 1]} {plan.year}
              </option>
            ))}
          </select>
        </div>

        <button 
          className="btn-primary"
          onClick={() => setShowNewPlanForm(!showNewPlanForm)}
        >
          + Nowy plan
        </button>
      </div>

      {showNewPlanForm && (
        <div className="new-plan-form">
          <h3>Utwórz nowy plan</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <select 
              value={newMonth} 
              onChange={(e) => setNewMonth(parseInt(e.target.value))}
            >
              {MONTHS.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>
            <input 
              type="number" 
              value={newYear}
              onChange={(e) => setNewYear(parseInt(e.target.value))}
              min="2020"
              max="2030"
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-success" onClick={handleCreatePlan}>Utwórz</button>
            <button className="btn-secondary" onClick={() => setShowNewPlanForm(false)}>Anuluj</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlanSelector;