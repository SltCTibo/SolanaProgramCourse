use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient Funds")]
    InsufficientFunds,
    #[msg("Requested amount exceeds borrowable amount")]
    OverBorrowableAmount,
    #[msg("Requested amount exceeds repayable amount")]
    OverRepay,
    #[msg("User is not under collateralized, can't be liquidated")]
    NotUnderCollateralized
}