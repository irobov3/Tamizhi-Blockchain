package types

import "fmt"

// proto.Message implementation for query request/response types.
// These methods satisfy the protoiface.MessageV1 interface required by
// grpc-gateway's runtime.PopulateQueryParameters and return-value checks.

func (m *QueryGetWorkRequest) Reset()         { *m = QueryGetWorkRequest{} }
func (m *QueryGetWorkRequest) String() string { return fmt.Sprintf("%+v", *m) }
func (*QueryGetWorkRequest) ProtoMessage()    {}

func (m *QueryGetWorkResponse) Reset()         { *m = QueryGetWorkResponse{} }
func (m *QueryGetWorkResponse) String() string { return fmt.Sprintf("%+v", *m) }
func (*QueryGetWorkResponse) ProtoMessage()    {}

func (m *QueryListWorksRequest) Reset()         { *m = QueryListWorksRequest{} }
func (m *QueryListWorksRequest) String() string { return fmt.Sprintf("%+v", *m) }
func (*QueryListWorksRequest) ProtoMessage()    {}

func (m *QueryListWorksResponse) Reset()         { *m = QueryListWorksResponse{} }
func (m *QueryListWorksResponse) String() string { return fmt.Sprintf("%+v", *m) }
func (*QueryListWorksResponse) ProtoMessage()    {}

func (m *QueryGetWorksByAuthorRequest) Reset()         { *m = QueryGetWorksByAuthorRequest{} }
func (m *QueryGetWorksByAuthorRequest) String() string { return fmt.Sprintf("%+v", *m) }
func (*QueryGetWorksByAuthorRequest) ProtoMessage()    {}

func (m *QueryGetWorksByAuthorResponse) Reset()         { *m = QueryGetWorksByAuthorResponse{} }
func (m *QueryGetWorksByAuthorResponse) String() string { return fmt.Sprintf("%+v", *m) }
func (*QueryGetWorksByAuthorResponse) ProtoMessage()    {}

func (m *QueryGetWorkCountRequest) Reset()         { *m = QueryGetWorkCountRequest{} }
func (m *QueryGetWorkCountRequest) String() string { return fmt.Sprintf("%+v", *m) }
func (*QueryGetWorkCountRequest) ProtoMessage()    {}

func (m *QueryGetWorkCountResponse) Reset()         { *m = QueryGetWorkCountResponse{} }
func (m *QueryGetWorkCountResponse) String() string { return fmt.Sprintf("%+v", *m) }
func (*QueryGetWorkCountResponse) ProtoMessage()    {}
