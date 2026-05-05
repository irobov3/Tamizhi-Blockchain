FROM envoyproxy/envoy:v1.29-latest
COPY envoy.yaml /etc/envoy/envoy.yaml
RUN chmod go+r /etc/envoy/envoy.yaml
EXPOSE 8080 9901
CMD ["/usr/local/bin/envoy", "-c", "/etc/envoy/envoy.yaml", "--service-cluster", "tamizhi-grpc-web"]
