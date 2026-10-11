// Korean card typography. Values are preserved from the uploaded ko preset.
// Keep the regular annotation family separate from the bold body family.
export const CARD_TYPOGRAPHY = {
    bodyFont: "VGKRBody",
    bodyLightFont: "VGKRBodyLight", // 주석 텍스트용. ( 수호자를 가진 카드는 덱에 합계 4장까지만 넣을 수 있다 )
    bodyFontSize: 11.5,
    bodyLineHeight: 15,
    bodyYOffset: 4,
    bodyLightYOffset: 0,    // Y축 Offset. 글줄의 행 맞추는 용도 ( 본문과 주석용 텍스트 따로 존재)
    bodyLetterSpacing: 0,
    bodyWordSpacing: 0,     // 문자열(띄어쓰기 1개는 포함 안되서 2개)과 문자 사이 자간 조절
    abilityLines: 14,       // 효과창 최대 14줄
    bodyScaleX: 0.95,
    bodyScaleY: 1,          // 문자 가로/세로 크기
    bodyJustify: true,

    nameFont: "VGKRBody",
    nameFontSize: 16,
    nameScaleX: 1,
    nameScaleY: 1,
    nameSkewX: -12,
    nameLetterSpacing: 0,
    nameAreaX: 75,          // 카드명 칸 X축 시작지점
    nameAreaWidth: 240,     // 카드명 칸 폭지정 (nameAreaX+이 값 = 카드명 영역 결정) 둘다 바꾸지말것
    nameStrokeWidth: 0.35,
    nameXOffset: 4,
    nameYOffset: 0,

    flavorFont: "VGKRFlavor",
    flavorFontSize: 12.5,
    flavorLineHeight: 1.1,
    flavorStrokeWidth: 1.5,      // 플레이버 텍스트 테두리 두께 (한국어판에서 조정)
    flavorLetterSpacing: -0.4,   // 자간, 플레이버 텍스트
    flavorYOffset: 16,    // Y축 Offset, 플레이버 텍스트 위치 조정

    nationFont: "VGKRBody",
    nationFontSize: 9.5,
    nationYOffset: 1.5, // 국가명 세로 위치: 양수는 아래, 음수는 위
    nationLetterSpacing: -0.1, // 자간: 양수는 넓게, 음수는 좁게

    raceFont: "VGKRBody",
    raceFontSize: 8,
    raceLetterSpacing: -0.4,
    raceYOffset: 0.25,

    subtypeLetterSpacing: 0,
    crestBodyYOffset: -1, // 크레스트 본문을 현재보다 아래로 3 이동
    rideDeckSpacingAdjust: -0.39, // 라이드 덱 크레스트 전용 자간·띄어쓰기 보정
    };