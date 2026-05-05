/**
 * Generic gRPC-Web client for Tamizhi chain.
 * Uses Fetch API with gRPC-Web encoding (base64 framing).
 * Works in both browser and Node.js (Node 18+).
 */
export class TamizhiGrpcWebClient {
  constructor(private baseUrl: string = 'http://localhost:8080') {}

  /**
   * Make a unary gRPC-Web call.
   * @param service - e.g. "tamizhi.rewards.v1.Query"
   * @param method  - e.g. "GetRewardRecord"
   * @param request - JSON body (will be sent as application/grpc-web+json)
   */
  async call<TReq, TRes>(service: string, method: string, request: TReq): Promise<TRes> {
    const url = `${this.baseUrl}/${service}/${method}`;

    // Encode as gRPC-Web: 5-byte frame header + JSON body
    const body = JSON.stringify(request);
    const bodyBytes = new TextEncoder().encode(body);
    const frame = new Uint8Array(5 + bodyBytes.length);
    frame[0] = 0; // no compression
    new DataView(frame.buffer).setUint32(1, bodyBytes.length, false); // big-endian length
    frame.set(bodyBytes, 5);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/grpc-web+json',
        'X-Grpc-Web': '1',
        'Accept': 'application/grpc-web+json',
      },
      body: frame,
    });

    if (!response.ok) {
      throw new Error(`gRPC-Web call failed: ${response.status} ${response.statusText}`);
    }

    const responseBuffer = await response.arrayBuffer();
    const responseBytes = new Uint8Array(responseBuffer);

    // Parse gRPC-Web frame: skip 5-byte header
    if (responseBytes.length < 5) throw new Error('Invalid gRPC-Web response');
    const messageLength = new DataView(responseBuffer).getUint32(1, false);
    const messageBytes = responseBytes.slice(5, 5 + messageLength);
    const messageText = new TextDecoder().decode(messageBytes);

    return JSON.parse(messageText) as TRes;
  }

  // Convenience methods for common queries
  async getRewardRecord(employeeId: string) {
    return this.call('tamizhi.rewards.v1.Query', 'GetRewardRecord', { employee_id: employeeId });
  }

  async getRewardRules() {
    return this.call('tamizhi.rewards.v1.Query', 'ListRewardRules', {});
  }

  async getActiveNodes() {
    return this.call('tamizhi.nodes.v1.Query', 'ListActiveNodes', {});
  }

  async estimateAPR(nodeId?: string) {
    return this.call('tamizhi.nodes.v1.Query', 'EstimateAPR', { node_id: nodeId || '' });
  }

  async listLiteratureWorks() {
    return this.call('tamizhi.literature.v1.Query', 'ListWorks', {});
  }

  async getBurnStats() {
    return this.call('tamizhi.feeburn.v1.Query', 'GetBurnStats', {});
  }
}
