import React from 'react';
import ReactDOM from 'react-dom';

// PortalMenu: render dropdown menu into document.body to avoid clipping by overflow/stacking contexts
const PortalMenu = React.forwardRef(({ children, className, style, ...props }, ref) => {
  if (typeof document === 'undefined') {
    return (
      <div ref={ref} className={className} style={style} {...props}>
        {children}
      </div>
    );
  }

  return ReactDOM.createPortal(
    <div ref={ref} className={className} style={style} {...props}>
      {children}
    </div>,
    document.body
  );
});

PortalMenu.displayName = 'PortalMenu';

export default PortalMenu;
