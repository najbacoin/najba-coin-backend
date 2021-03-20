echo "---> Compiling sources"
npm run build

echo "---> Building zip"

OUTPUT_DIR="lambda"

rm -rf ${OUTPUT_DIR}
mkdir -p ${OUTPUT_DIR}

for DIR in $(ls ./dist/src/functions/) ; do
    echo "  ${DIR}..."
    zip -9 -j ./${OUTPUT_DIR}/${DIR}.zip ./dist/src/functions/${DIR}/*
done
