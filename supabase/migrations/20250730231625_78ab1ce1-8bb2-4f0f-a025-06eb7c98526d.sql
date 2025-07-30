INSERT INTO certification_workflows (user_id, course_id, level, current_step, exam_status, admin_approval_status, contract_status, subscription_status)
SELECT u.id, '550e8400-e29b-41d4-a716-446655440000', 1, 'exam', 'pending_submission', 'pending', 'not_required', 'not_required'
FROM auth.users u 
WHERE u.email = 'carry@yopmail.com';