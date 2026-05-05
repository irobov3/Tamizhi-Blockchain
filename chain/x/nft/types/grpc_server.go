package types

import (
	"context"

	grpc1 "github.com/cosmos/gogoproto/grpc"
	grpc "google.golang.org/grpc"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
)

// ============================================================
// MsgServer interface
// ============================================================

// MsgServer is the server API for the NFT Msg service.
type MsgServer interface {
	MintNFT(context.Context, *MsgMintNFT) (*MsgMintNFTResponse, error)
	TransferNFT(context.Context, *MsgTransferNFT) (*MsgTransferNFTResponse, error)
	BurnNFT(context.Context, *MsgBurnNFT) (*MsgBurnNFTResponse, error)
}

// UnimplementedMsgServer can be embedded to have forward compatible implementations.
type UnimplementedMsgServer struct{}

func (*UnimplementedMsgServer) MintNFT(_ context.Context, _ *MsgMintNFT) (*MsgMintNFTResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method MintNFT not implemented")
}
func (*UnimplementedMsgServer) TransferNFT(_ context.Context, _ *MsgTransferNFT) (*MsgTransferNFTResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method TransferNFT not implemented")
}
func (*UnimplementedMsgServer) BurnNFT(_ context.Context, _ *MsgBurnNFT) (*MsgBurnNFTResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method BurnNFT not implemented")
}

// RegisterMsgServer registers the MsgServer implementation with the gRPC server.
func RegisterMsgServer(s grpc1.Server, srv MsgServer) {
	s.RegisterService(&_Msg_serviceDesc, srv)
}

func _Msg_MintNFT_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(MsgMintNFT)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(MsgServer).MintNFT(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/tamizhi.nft.v1.Msg/MintNFT",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(MsgServer).MintNFT(ctx, req.(*MsgMintNFT))
	}
	return interceptor(ctx, in, info, handler)
}

func _Msg_TransferNFT_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(MsgTransferNFT)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(MsgServer).TransferNFT(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/tamizhi.nft.v1.Msg/TransferNFT",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(MsgServer).TransferNFT(ctx, req.(*MsgTransferNFT))
	}
	return interceptor(ctx, in, info, handler)
}

func _Msg_BurnNFT_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(MsgBurnNFT)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(MsgServer).BurnNFT(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/tamizhi.nft.v1.Msg/BurnNFT",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(MsgServer).BurnNFT(ctx, req.(*MsgBurnNFT))
	}
	return interceptor(ctx, in, info, handler)
}

var _Msg_serviceDesc = grpc.ServiceDesc{
	ServiceName: "tamizhi.nft.v1.Msg",
	HandlerType: (*MsgServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "MintNFT",
			Handler:    _Msg_MintNFT_Handler,
		},
		{
			MethodName: "TransferNFT",
			Handler:    _Msg_TransferNFT_Handler,
		},
		{
			MethodName: "BurnNFT",
			Handler:    _Msg_BurnNFT_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "tamizhi/nft/v1/tx.proto",
}

// ============================================================
// Query types
// ============================================================

type QueryGetNFTRequest struct {
	TokenID string `json:"token_id"`
}
type QueryGetNFTResponse struct {
	NFT LiteraryNFT `json:"nft"`
}
type QueryListNFTsByOwnerRequest struct {
	Owner string `json:"owner"`
}
type QueryListNFTsByOwnerResponse struct {
	NFTs []LiteraryNFT `json:"nfts"`
}
type QueryListNFTsByWorkRequest struct {
	WorkID string `json:"work_id"`
}
type QueryListNFTsByWorkResponse struct {
	NFTs []LiteraryNFT `json:"nfts"`
}

// ============================================================
// QueryServer interface
// ============================================================

// QueryServer is the server API for the NFT Query service.
type QueryServer interface {
	GetNFT(context.Context, *QueryGetNFTRequest) (*QueryGetNFTResponse, error)
	ListNFTsByOwner(context.Context, *QueryListNFTsByOwnerRequest) (*QueryListNFTsByOwnerResponse, error)
	ListNFTsByWork(context.Context, *QueryListNFTsByWorkRequest) (*QueryListNFTsByWorkResponse, error)
}

// UnimplementedQueryServer can be embedded to have forward compatible implementations.
type UnimplementedQueryServer struct{}

func (*UnimplementedQueryServer) GetNFT(_ context.Context, _ *QueryGetNFTRequest) (*QueryGetNFTResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetNFT not implemented")
}
func (*UnimplementedQueryServer) ListNFTsByOwner(_ context.Context, _ *QueryListNFTsByOwnerRequest) (*QueryListNFTsByOwnerResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ListNFTsByOwner not implemented")
}
func (*UnimplementedQueryServer) ListNFTsByWork(_ context.Context, _ *QueryListNFTsByWorkRequest) (*QueryListNFTsByWorkResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method ListNFTsByWork not implemented")
}

// RegisterQueryServer registers the QueryServer implementation with the gRPC server.
func RegisterQueryServer(s grpc1.Server, srv QueryServer) {
	s.RegisterService(&_Query_serviceDesc, srv)
}

func _Query_GetNFT_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(QueryGetNFTRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(QueryServer).GetNFT(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/tamizhi.nft.v1.Query/GetNFT",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(QueryServer).GetNFT(ctx, req.(*QueryGetNFTRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _Query_ListNFTsByOwner_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(QueryListNFTsByOwnerRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(QueryServer).ListNFTsByOwner(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/tamizhi.nft.v1.Query/ListNFTsByOwner",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(QueryServer).ListNFTsByOwner(ctx, req.(*QueryListNFTsByOwnerRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _Query_ListNFTsByWork_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(QueryListNFTsByWorkRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(QueryServer).ListNFTsByWork(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/tamizhi.nft.v1.Query/ListNFTsByWork",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(QueryServer).ListNFTsByWork(ctx, req.(*QueryListNFTsByWorkRequest))
	}
	return interceptor(ctx, in, info, handler)
}

var _Query_serviceDesc = grpc.ServiceDesc{
	ServiceName: "tamizhi.nft.v1.Query",
	HandlerType: (*QueryServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "GetNFT",
			Handler:    _Query_GetNFT_Handler,
		},
		{
			MethodName: "ListNFTsByOwner",
			Handler:    _Query_ListNFTsByOwner_Handler,
		},
		{
			MethodName: "ListNFTsByWork",
			Handler:    _Query_ListNFTsByWork_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "tamizhi/nft/v1/query.proto",
}

// NewQueryClient returns nil — a no-op stub for GRPC gateway wiring.
// Full REST gateway support requires protobuf generation.
func NewQueryClient(_ grpc.ClientConnInterface) QueryServer { return nil }
