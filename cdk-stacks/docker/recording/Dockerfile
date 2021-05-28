# Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

FROM public.ecr.aws/lts/ubuntu:18.04_stable

ENV DEBIAN_FRONTEND noninteractive

RUN /usr/bin/apt-get update && \
	/usr/bin/apt-get install -y curl && \
	curl -sL https://deb.nodesource.com/setup_14.x | bash - && \
	/usr/bin/apt-get update && \
	/usr/bin/apt-get upgrade -y && \
	/usr/bin/apt-get install -y nodejs pulseaudio xvfb firefox ffmpeg xdotool unzip dbus-x11

# Install and build recording-app
COPY /recording-app /recording-app
WORKDIR /recording-app
RUN rm -f package-lock.json
RUN rm -Rf node_modules
RUN npm install
RUN npm run build

# Install recording-task
COPY /recording-task /recording-task
WORKDIR /recording-task
RUN rm -f package-lock.json
RUN rm -Rf node_modules
RUN npm install
RUN	chmod +x /recording-task/run.sh
RUN	chmod +x /recording-task/record.js

# Install the OpenH264 plugin for Firefox
RUN mkdir -p /tmp/foo4/gmp-gmpopenh264/1.8.1.1/
WORKDIR /tmp/foo4/gmp-gmpopenh264/1.8.1.1
RUN curl -s -O http://ciscobinary.openh264.org/openh264-linux64-2e1774ab6dc6c43debb0b5b628bdf122a391d521.zip
RUN unzip openh264-linux64-2e1774ab6dc6c43debb0b5b628bdf122a391d521.zip
RUN rm -f openh264-linux64-2e1774ab6dc6c43debb0b5b628bdf122a391d521.zip

WORKDIR /recording-task
ENTRYPOINT ["/recording-task/run.sh"]
