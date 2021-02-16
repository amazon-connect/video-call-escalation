// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {useRef, useEffect} from 'react'

export default function useNonInitialEffect(effect, deps){
    const initialRender = useRef(true);

    useEffect(() => {
        let effectReturns = () => {}
        if(initialRender.current){
            initialRender.current = false;
        }
        else{
            effectReturns = effect();
        }
        
        if(effectReturns && typeof effectReturns==="function"){
            return effectReturns;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

}