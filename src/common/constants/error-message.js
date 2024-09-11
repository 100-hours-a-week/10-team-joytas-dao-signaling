const ErrorMessage = Object.freeze({
    // 환경변수
    ENV_FILE_NOT_FOUND: '환경변수 파일을 찾을 수 없습니다.',
    NODE_ENV_WRONG:
        'NODE_ENV가 올바르게 설정되지 않았습니다. [ production / development / local 중 하나로 설정되어야 합니다.\n 명시되지 않음으로 인해 development로 설정 됩니다.',
});

module.exports = ErrorMessage;
