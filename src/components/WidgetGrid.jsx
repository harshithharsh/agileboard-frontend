import { useState } from 'react';
import { GripIcon, EyeOffIcon, ArrowLeftIcon, ArrowRightIcon, WidthIcon } from './Icons.jsx';
import { moveWidget, stepWidget, updateWidget, widgetTitle } from '../lib/layout.js';

// Dashboard widgets in the user's order. While customizing, widgets can be dragged onto
// each other to swap places, moved with the arrow buttons, made wide or half width, or hidden.
export default function WidgetGrid({ layout, widgets, editing, onChange }) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const visible = layout.filter((w) => !w.hidden && widgets[w.id]);

  const endDrag = () => {
    setDragId(null);
    setOverId(null);
  };
  const dragProps = (id) => editing && {
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
      setDragId(id);
    },
    onDragOver: (e) => {
      if (!dragId) return;
      e.preventDefault();
      if (overId !== id) setOverId(id);
    },
    onDrop: (e) => {
      e.preventDefault();
      if (dragId && dragId !== id) onChange(moveWidget(layout, dragId, id));
      endDrag();
    },
    onDragEnd: endDrag,
  };

  return (
    <div className={`widget-grid${editing ? ' editing' : ''}`}>
      {visible.map((w, i) => {
        const classes = ['widget', `widget-${w.size}`, dragId === w.id && 'dragging', overId === w.id && dragId !== w.id && 'drop-target'];
        return (
          <div key={w.id} className={classes.filter(Boolean).join(' ')} {...dragProps(w.id)}>
            {editing && (
              <div className="widget-bar">
                <span className="widget-grip" title="Drag to move"><GripIcon /></span>
                <span className="widget-name">{widgetTitle(w.id)}</span>
                <div className="widget-tools">
                  <button onClick={() => onChange(stepWidget(layout, w.id, -1))} disabled={i === 0} title="Move earlier" aria-label={`Move ${widgetTitle(w.id)} earlier`}><ArrowLeftIcon /></button>
                  <button onClick={() => onChange(stepWidget(layout, w.id, 1))} disabled={i === visible.length - 1} title="Move later" aria-label={`Move ${widgetTitle(w.id)} later`}><ArrowRightIcon /></button>
                  <button onClick={() => onChange(updateWidget(layout, w.id, { size: w.size === 'full' ? 'half' : 'full' }))}
                    title={w.size === 'full' ? 'Make half width' : 'Make full width'} aria-label={w.size === 'full' ? 'Make half width' : 'Make full width'}
                    className={w.size === 'full' ? 'active' : ''}><WidthIcon /></button>
                  <button onClick={() => onChange(updateWidget(layout, w.id, { hidden: true }))} title="Hide widget" aria-label={`Hide ${widgetTitle(w.id)}`}><EyeOffIcon /></button>
                </div>
              </div>
            )}
            <div className="widget-body">{widgets[w.id]}</div>
          </div>
        );
      })}
      {!visible.length && <div className="card empty widget-full">All widgets are hidden. {editing ? 'Add them back from the bar above.' : 'Click Customize to show them again.'}</div>}
    </div>
  );
}
