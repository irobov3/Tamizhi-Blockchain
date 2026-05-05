package types

import (
	"context"

	grpc1 "github.com/cosmos/gogoproto/grpc"
	proto "github.com/cosmos/gogoproto/proto"
	grpc "google.golang.org/grpc"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
)

// QueryGetBurnStatsRequest is the request type for the GetBurnStats query.
type QueryGetBurnStatsRequest struct{}

// QueryGetBurnStatsResponse is the response type for the GetBurnStats query.
type QueryGetBurnStatsResponse struct {
	Stats BurnStats `json:"stats"`
}

// proto.Message implementation for QueryGetBurnStatsRequest.
func (m *QueryGetBurnStatsRequest) Reset()         {}
func (m *QueryGetBurnStatsRequest) String() string { return "QueryGetBurnStatsRequest{}" }
func (m *QueryGetBurnStatsRequest) ProtoMessage()  {}

// proto.Message implementation for QueryGetBurnStatsResponse.
func (m *QueryGetBurnStatsResponse) Reset()         {}
func (m *QueryGetBurnStatsResponse) String() string { return "QueryGetBurnStatsResponse{}" }
func (m *QueryGetBurnStatsResponse) ProtoMessage()  {}

// ensure proto.Message interface is satisfied.
var _ proto.Message = (*QueryGetBurnStatsRequest)(nil)
var _ proto.Message = (*QueryGetBurnStatsResponse)(nil)

// QueryServer is the server API for the Query service.
type QueryServer interface {
	GetBurnStats(context.Context, *QueryGetBurnStatsRequest) (*QueryGetBurnStatsResponse, error)
}

// QueryClient is the client API for the Query service.
type QueryClient interface {
	GetBurnStats(ctx context.Context, in *QueryGetBurnStatsRequest, opts ...grpc.CallOption) (*QueryGetBurnStatsResponse, error)
}

// UnimplementedQueryServer can be embedded to have forward compatible implementations.
type UnimplementedQueryServer struct{}

func (*UnimplementedQueryServer) GetBurnStats(ctx context.Context, req *QueryGetBurnStatsRequest) (*QueryGetBurnStatsResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetBurnStats not implemented")
}

type queryClient struct {
	cc grpc1.ClientConn
}

func NewQueryClient(cc grpc1.ClientConn) QueryClient {
	return &queryClient{cc}
}

func (c *queryClient) GetBurnStats(ctx context.Context, in *QueryGetBurnStatsRequest, opts ...grpc.CallOption) (*QueryGetBurnStatsResponse, error) {
	out := new(QueryGetBurnStatsResponse)
	err := c.cc.Invoke(ctx, "/tamizhi.feeburn.v1.Query/GetBurnStats", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func _Query_GetBurnStats_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(QueryGetBurnStatsRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(QueryServer).GetBurnStats(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/tamizhi.feeburn.v1.Query/GetBurnStats",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(QueryServer).GetBurnStats(ctx, req.(*QueryGetBurnStatsRequest))
	}
	return interceptor(ctx, in, info, handler)
}

var _Query_serviceDesc = grpc.ServiceDesc{
	ServiceName: "tamizhi.feeburn.v1.Query",
	HandlerType: (*QueryServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "GetBurnStats",
			Handler:    _Query_GetBurnStats_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "tamizhi/feeburn/v1/query.proto",
}

func RegisterQueryServer(s grpc1.Server, srv QueryServer) {
	s.RegisterService(&_Query_serviceDesc, srv)
}

// RegisterInterfaces is a no-op for feeburn (no Msg types to register).
func RegisterInterfaces(_ interface{}) {}
