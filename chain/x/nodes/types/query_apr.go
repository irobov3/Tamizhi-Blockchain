package types

const (
	// RewardPerMessage is the utmz reward per message stored by a node.
	RewardPerMessage = uint64(1000)
)

// QueryEstimateAPRRequest is the request type for the EstimateAPR query.
// NodeID is optional; if empty, a network-wide estimate is returned.
type QueryEstimateAPRRequest struct {
	NodeID string `json:"node_id"` // empty = network-wide estimate
}

// QueryEstimateAPRResponse is the response type for the EstimateAPR query.
type QueryEstimateAPRResponse struct {
	NodeID             string `json:"node_id,omitempty"`
	StakedAmount       string `json:"staked_amount"`        // in utmz
	UptimeScore        uint64 `json:"uptime_score"`         // 0-100
	MessagesStored     uint64 `json:"messages_stored"`
	DailyRewardEst     string `json:"daily_reward_est"`     // utmz/day
	AnnualRewardEst    string `json:"annual_reward_est"`    // utmz/year
	EstimatedAPR       string `json:"estimated_apr"`        // "12.45" (percent)
	NetworkAPR         string `json:"network_apr"`          // network-wide APR
	TotalNetworkStaked string `json:"total_network_staked"` // utmz
}

// Implement proto.Message interface (needed for grpc-gateway).

func (r *QueryEstimateAPRRequest) Reset()        {}
func (r *QueryEstimateAPRRequest) String() string { return r.NodeID }
func (r *QueryEstimateAPRRequest) ProtoMessage()  {}

func (r *QueryEstimateAPRResponse) Reset()        {}
func (r *QueryEstimateAPRResponse) String() string { return r.EstimatedAPR }
func (r *QueryEstimateAPRResponse) ProtoMessage()  {}
