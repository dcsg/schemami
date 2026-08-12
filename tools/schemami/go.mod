module github.com/dcsg/schemami/tools/schemami

go 1.26.1

require (
	github.com/dcsg/schemami/sdk/go v0.0.0
	github.com/santhosh-tekuri/jsonschema/v6 v6.0.2
	gopkg.in/yaml.v3 v3.0.1
	github.com/dlclark/regexp2 v1.11.0 // indirect
	golang.org/x/text v0.14.0 // indirect
	gopkg.in/check.v1 v0.0.0-20161208181325-20d25e280405 // indirect
)

replace github.com/dcsg/schemami/sdk/go => ../../sdk/go
