package types

import (
	"context"

	grpc "google.golang.org/grpc"
)

// grpcServer is the minimal interface required to register a gRPC service.
// Both google.golang.org/grpc.Server and github.com/cosmos/gogoproto/grpc.Server
// satisfy this interface since they both expose RegisterService with the same
// *grpc.ServiceDesc parameter type.
type grpcServer interface {
	RegisterService(sd *grpc.ServiceDesc, ss interface{})
}

// ============================================================
// MsgServer interface
// ============================================================

// MsgServer is the server API for the literature Msg service.
type MsgServer interface {
	SubmitWork(context.Context, *MsgSubmitWork) (*MsgSubmitWorkResponse, error)
	UpdateArweave(context.Context, *MsgUpdateArweave) (*MsgUpdateArweaveResponse, error)
	VerifyWork(context.Context, *MsgVerifyWork) (*MsgVerifyWorkResponse, error)
}

// MsgSubmitWorkResponse is the response type for SubmitWork.
type MsgSubmitWorkResponse struct {
	WorkId string `json:"work_id"`
}

// MsgUpdateArweaveResponse is the response type for UpdateArweave.
type MsgUpdateArweaveResponse struct{}

// MsgVerifyWorkResponse is the response type for VerifyWork.
type MsgVerifyWorkResponse struct{}

// ============================================================
// QueryServer interface
// ============================================================

// QueryServer is the server API for the literature Query service.
type QueryServer interface {
	GetWork(context.Context, *QueryGetWorkRequest) (*QueryGetWorkResponse, error)
	ListWorks(context.Context, *QueryListWorksRequest) (*QueryListWorksResponse, error)
	GetWorksByAuthor(context.Context, *QueryGetWorksByAuthorRequest) (*QueryGetWorksByAuthorResponse, error)
	GetWorkCount(context.Context, *QueryGetWorkCountRequest) (*QueryGetWorkCountResponse, error)
}

// QueryGetWorkRequest is the request type for GetWork.
type QueryGetWorkRequest struct {
	WorkId string `json:"work_id"`
}

// QueryGetWorkResponse is the response type for GetWork.
type QueryGetWorkResponse struct {
	Work LiteraryWork `json:"work"`
}

// QueryListWorksRequest is the request type for ListWorks.
type QueryListWorksRequest struct {
	Limit  uint64 `json:"limit,omitempty"`
	Offset uint64 `json:"offset,omitempty"`
}

// QueryListWorksResponse is the response type for ListWorks.
type QueryListWorksResponse struct {
	Works []LiteraryWork `json:"works"`
	Total uint64         `json:"total"`
}

// QueryGetWorksByAuthorRequest is the request type for GetWorksByAuthor.
type QueryGetWorksByAuthorRequest struct {
	Author string `json:"author"`
}

// QueryGetWorksByAuthorResponse is the response type for GetWorksByAuthor.
type QueryGetWorksByAuthorResponse struct {
	Works []LiteraryWork `json:"works"`
}

// QueryGetWorkCountRequest is the request type for GetWorkCount.
type QueryGetWorkCountRequest struct{}

// QueryGetWorkCountResponse is the response type for GetWorkCount.
type QueryGetWorkCountResponse struct {
	Count uint64 `json:"count"`
}

// ============================================================
// Hand-written gRPC service descriptors (replaces protoc output)
// ============================================================

// _Msg_serviceDesc is the grpc.ServiceDesc for the Msg service.
var _Msg_serviceDesc = grpc.ServiceDesc{
	ServiceName: "tamizhi.literature.v1.Msg",
	HandlerType: (*MsgServer)(nil),
	Methods: []grpc.MethodDesc{
		{MethodName: "SubmitWork", Handler: _Msg_SubmitWork_Handler},
		{MethodName: "UpdateArweave", Handler: _Msg_UpdateArweave_Handler},
		{MethodName: "VerifyWork", Handler: _Msg_VerifyWork_Handler},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "tamizhi/literature/v1/tx.proto",
}

func _Msg_SubmitWork_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(MsgSubmitWork)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(MsgServer).SubmitWork(ctx, in)
	}
	info := &grpc.UnaryServerInfo{Server: srv, FullMethod: "/tamizhi.literature.v1.Msg/SubmitWork"}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(MsgServer).SubmitWork(ctx, req.(*MsgSubmitWork))
	}
	return interceptor(ctx, in, info, handler)
}

func _Msg_UpdateArweave_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(MsgUpdateArweave)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(MsgServer).UpdateArweave(ctx, in)
	}
	info := &grpc.UnaryServerInfo{Server: srv, FullMethod: "/tamizhi.literature.v1.Msg/UpdateArweave"}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(MsgServer).UpdateArweave(ctx, req.(*MsgUpdateArweave))
	}
	return interceptor(ctx, in, info, handler)
}

func _Msg_VerifyWork_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(MsgVerifyWork)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(MsgServer).VerifyWork(ctx, in)
	}
	info := &grpc.UnaryServerInfo{Server: srv, FullMethod: "/tamizhi.literature.v1.Msg/VerifyWork"}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(MsgServer).VerifyWork(ctx, req.(*MsgVerifyWork))
	}
	return interceptor(ctx, in, info, handler)
}

// RegisterMsgServer registers the MsgServer implementation with the gRPC server.
func RegisterMsgServer(s grpcServer, srv MsgServer) {
	s.RegisterService(&_Msg_serviceDesc, srv)
}

// _Query_serviceDesc is the grpc.ServiceDesc for the Query service.
var _Query_serviceDesc = grpc.ServiceDesc{
	ServiceName: "tamizhi.literature.v1.Query",
	HandlerType: (*QueryServer)(nil),
	Methods: []grpc.MethodDesc{
		{MethodName: "GetWork", Handler: _Query_GetWork_Handler},
		{MethodName: "ListWorks", Handler: _Query_ListWorks_Handler},
		{MethodName: "GetWorksByAuthor", Handler: _Query_GetWorksByAuthor_Handler},
		{MethodName: "GetWorkCount", Handler: _Query_GetWorkCount_Handler},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "tamizhi/literature/v1/query.proto",
}

func _Query_GetWork_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(QueryGetWorkRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(QueryServer).GetWork(ctx, in)
	}
	info := &grpc.UnaryServerInfo{Server: srv, FullMethod: "/tamizhi.literature.v1.Query/GetWork"}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(QueryServer).GetWork(ctx, req.(*QueryGetWorkRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _Query_ListWorks_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(QueryListWorksRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(QueryServer).ListWorks(ctx, in)
	}
	info := &grpc.UnaryServerInfo{Server: srv, FullMethod: "/tamizhi.literature.v1.Query/ListWorks"}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(QueryServer).ListWorks(ctx, req.(*QueryListWorksRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _Query_GetWorksByAuthor_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(QueryGetWorksByAuthorRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(QueryServer).GetWorksByAuthor(ctx, in)
	}
	info := &grpc.UnaryServerInfo{Server: srv, FullMethod: "/tamizhi.literature.v1.Query/GetWorksByAuthor"}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(QueryServer).GetWorksByAuthor(ctx, req.(*QueryGetWorksByAuthorRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _Query_GetWorkCount_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(QueryGetWorkCountRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(QueryServer).GetWorkCount(ctx, in)
	}
	info := &grpc.UnaryServerInfo{Server: srv, FullMethod: "/tamizhi.literature.v1.Query/GetWorkCount"}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(QueryServer).GetWorkCount(ctx, req.(*QueryGetWorkCountRequest))
	}
	return interceptor(ctx, in, info, handler)
}

// RegisterQueryServer registers the QueryServer implementation with the gRPC server.
func RegisterQueryServer(s grpcServer, srv QueryServer) {
	s.RegisterService(&_Query_serviceDesc, srv)
}
