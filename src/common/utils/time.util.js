function getResponseTimeMs(startTime) {
    const diff = process.hrtime(startTime);
    // 초 단위를 밀리초로 변환하여 소수점 두 자리까지 표시
    return (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
}

module.exports = { getResponseTimeMs };
