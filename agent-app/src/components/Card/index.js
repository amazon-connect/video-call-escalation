// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, {Component} from 'react';

import { SmallText, StyledCard } from './Styled';

export default class Card extends Component{
    constructor(props) {
        super(props);
        this.state = {};
      }

      render(){
        return(
            <StyledCard>
                {this.props.header && <div className="ch-header">{this.props.header}</div>}
                <div className="ch-body">
                <div className="ch-title">{this.props.title}</div>
                <div className="ch-description">{this.props.description}</div>
                {this.props.smallText && <SmallText>{this.props.smallText}</SmallText>}
                </div>
            </StyledCard>
        )
      }
}
