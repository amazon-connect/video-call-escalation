// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, {
    useState,
    useContext,
    useEffect,
    useRef
  } from 'react';
  

  
  const NavigationContext = React.createContext(
    null
  );
  
  const isDesktop = () => window.innerWidth > 768;
  
  const NavigationProvider = ({ children }) => {
    const [showNavbar, setShowNavbar] = useState(() => isDesktop());
    const [showRoster, setShowRoster] = useState(() => isDesktop());
    const [showMetrics, setShowMetrics] = useState(false);
    const isDesktopView = useRef(isDesktop());
  
    useEffect(() => {
      const handler = () => {
        const isResizeDesktop = isDesktop();
        if (isDesktopView.current === isResizeDesktop) {
          return;
        }
  
        isDesktopView.current = isResizeDesktop;
  
        if (!isResizeDesktop) {
          setShowNavbar(false);
          setShowRoster(false);
        } else {
          setShowNavbar(true);
        }
      };
  
      window.addEventListener('resize', handler);
      return () => window.removeEventListener('resize', handler);
    }, []);
  
    const toggleRoster = () => {
      setShowRoster(!showRoster);
    };
  
    const toggleNavbar = () => {
      setShowNavbar(!showNavbar);
    };
  
    const toggleMetrics = () => {
      setShowMetrics(currentState => !currentState);
    };
  
    const openNavbar = () => {
      setShowNavbar(true);
    };
  
    const closeNavbar = () => {
      setShowNavbar(false);
    };
  
    const openRoster = () => {
      setShowRoster(true);
    };
  
    const closeRoster = () => {
      setShowRoster(false);
    };
  
    const providerValue = {
      showNavbar,
      showRoster,
      showMetrics,
      toggleRoster,
      toggleNavbar,
      toggleMetrics,
      openRoster,
      closeRoster,
      openNavbar,
      closeNavbar
    };
    return (
      <NavigationContext.Provider value={providerValue}>
        {children}
      </NavigationContext.Provider>
    );
  };
  
  const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
      throw Error('Use useNavigation in NavigationProvider');
    }
    return context;
  };
  
  export { NavigationProvider, useNavigation };