# Example usage: ./scripts/build-and-deploy.sh api
set -xe
LOCAL_NAME=$1
FUNCTIONS='
{
  "api": "api",
  "db-migrator": "db-migrator"
}'

LAMBDA_NAME="$(echo $FUNCTIONS | jq -r .[\"${LOCAL_NAME}\"])"

FUNC_NAME=$1 ./scripts/build.sh

aws lambda update-function-code --region us-west-2 --publish \
    --function-name "${LAMBDA_NAME}" \
    --zip-file "fileb://lambda/${LOCAL_NAME}.zip"
